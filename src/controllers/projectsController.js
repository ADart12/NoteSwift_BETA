import Project from "../models/TechnologyModel/projectModel.js";
import Task from "../models/TechnologyModel/taskModel.js";
import User from "../models/usersModel.js";
import Department from "../models/DepartmentModel.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getTechDeptIds = async (user) => {
  const techDepts = await Department.find({
    status: "Active",
    $or: [
      { name: { $regex: /technology|software|engineering|development|tech/i } },
      { code: { $regex: /^(TECH|SD|ENG|DEV)$/i } },
    ],
  });
  const ids = techDepts.map((d) => d._id);
  const userDeptId = user.department?._id || user.department;
  if (userDeptId && !ids.some((id) => id.toString() === userDeptId.toString())) {
    ids.push(userDeptId);
  }
  return ids;
};

// ─── GET /api/engineering/projects ──────────────────────────────────────────
export const getProjects = async (req, res) => {
  try {
    const user = req.user;
    const isSuperUser =
      user.role === "ceo" || user.role === "super_admin" || user.role === "admin";

    const filter = { isDeleted: false };
    if (!isSuperUser) {
      const techDeptIds = await getTechDeptIds(user);
      filter.department = { $in: techDeptIds };
    }

    const { status, search } = req.query;
    if (status && status !== "All") filter.status = status;
    if (search) filter.name = { $regex: search, $options: "i" };

    const projects = await Project.find(filter)
      .populate("manager", "fullName email designation")
      .populate("department", "name code")
      .sort({ updatedAt: -1 });

    // Enrich each project with task stats
    const enriched = await Promise.all(
      projects.map(async (proj) => {
        const tasks = await Task.find({ project: proj._id, isDeleted: false });
        const total = tasks.length;
        const done = tasks.filter((t) => t.status === "Done").length;
        const inProgress = tasks.filter((t) => t.status === "In_Progress").length;
        const inReview = tasks.filter((t) => t.status === "In_Review").length;
        const backlog = tasks.filter((t) => t.status === "Backlog").length;
        const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
        const totalPoints = tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
        const completedPoints = tasks
          .filter((t) => t.status === "Done")
          .reduce((s, t) => s + (t.estimatedHours || 0), 0);
        const critical = tasks.filter(
          (t) => t.priority === "Critical" && t.status !== "Done"
        ).length;

        const now = new Date();
        let statusPill = "On Track";
        if (proj.status === "On_Hold") statusPill = "On Hold";
        else if (proj.endDate && new Date(proj.endDate) < now && progressPct < 100)
          statusPill = "Delayed";
        else if (progressPct < 30 && proj.status === "Active") statusPill = "At Risk";

        return {
          _id: proj._id,
          name: proj.name,
          code: proj.code,
          description: proj.description,
          status: proj.status,
          statusPill,
          startDate: proj.startDate,
          endDate: proj.endDate,
          budgetAllocated: proj.budgetAllocated,
          department: proj.department,
          manager: proj.manager,
          progressPct,
          taskStats: { total, done, inProgress, inReview, backlog },
          storyPoints: { total: totalPoints, completed: completedPoints },
          blockers: critical,
          createdAt: proj.createdAt,
          updatedAt: proj.updatedAt,
        };
      })
    );

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    console.error("getProjects error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/engineering/projects ─────────────────────────────────────────
export const createProject = async (req, res) => {
  try {
    const user = req.user;
    const { name, code, description, startDate, endDate, budgetAllocated, managerId, departmentId } =
      req.body;

    if (!name || !code || !startDate) {
      return res.status(400).json({ success: false, message: "name, code and startDate are required" });
    }

    const deptId = departmentId || user.department?._id || user.department;
    const mgr = managerId || user._id;

    const project = new Project({
      name,
      code: code.toUpperCase(),
      description: description || "",
      startDate,
      endDate: endDate || null,
      budgetAllocated: budgetAllocated || 0,
      manager: mgr,
      department: deptId,
      status: "Planning",
    });

    await project.save();
    await project.populate("manager", "fullName email");
    await project.populate("department", "name code");

    return res.status(201).json({ success: true, data: project, message: "Project created successfully" });
  } catch (error) {
    console.error("createProject error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Project code already exists" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /api/engineering/projects/:id ────────────────────────────────────
export const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.isDeleted;
    if (updates.code) updates.code = updates.code.toUpperCase();

    const project = await Project.findByIdAndUpdate(id, updates, { new: true })
      .populate("manager", "fullName email")
      .populate("department", "name code");

    if (!project || project.isDeleted) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    return res.status(200).json({ success: true, data: project, message: "Project updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /api/engineering/projects/:id ───────────────────────────────────
export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await Project.findByIdAndUpdate(id, { isDeleted: true });
    await Task.updateMany({ project: id }, { isDeleted: true });
    return res.status(200).json({ success: true, message: "Project deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/engineering/tasks ─────────────────────────────────────────────
export const getTasks = async (req, res) => {
  try {
    const user = req.user;
    const isSuperUser =
      user.role === "ceo" || user.role === "super_admin" || user.role === "admin";

    let projectFilter = { isDeleted: false };
    if (!isSuperUser) {
      const techDeptIds = await getTechDeptIds(user);
      projectFilter.department = { $in: techDeptIds };
    }

    const allowedProjects = await Project.find(projectFilter).select("_id");
    const allowedIds = allowedProjects.map((p) => p._id);

    const { projectId, status, priority, assignedTo, search } = req.query;
    const taskFilter = {
      isDeleted: false,
      project: projectId ? projectId : { $in: allowedIds },
    };
    if (status && status !== "All") taskFilter.status = status;
    if (priority && priority !== "All") taskFilter.priority = priority;
    if (assignedTo) taskFilter.assignedTo = assignedTo;
    if (search) taskFilter.title = { $regex: search, $options: "i" };

    const tasks = await Task.find(taskFilter)
      .populate("assignedTo", "fullName email designation")
      .populate("project", "name code status")
      .sort({ updatedAt: -1 });

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error("getTasks error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/engineering/tasks ────────────────────────────────────────────
export const createTask = async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, priority, dueDate, estimatedHours } =
      req.body;

    if (!title || !projectId || !assignedTo) {
      return res.status(400).json({ success: false, message: "title, projectId and assignedTo are required" });
    }

    const task = new Task({
      title,
      description: description || "",
      project: projectId,
      assignedTo,
      priority: priority || "Medium",
      dueDate: dueDate || null,
      estimatedHours: estimatedHours || 0,
      status: "Backlog",
    });

    await task.save();
    await task.populate("assignedTo", "fullName email designation");
    await task.populate("project", "name code status");

    return res.status(201).json({ success: true, data: task, message: "Task created successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PATCH /api/engineering/tasks/:id ───────────────────────────────────────
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.isDeleted;

    const task = await Task.findByIdAndUpdate(id, updates, { new: true })
      .populate("assignedTo", "fullName email designation")
      .populate("project", "name code status");

    if (!task || task.isDeleted) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    return res.status(200).json({ success: true, data: task, message: "Task updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE /api/engineering/tasks/:id ──────────────────────────────────────
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await Task.findByIdAndUpdate(id, { isDeleted: true });
    return res.status(200).json({ success: true, message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/engineering/members ───────────────────────────────────────────
export const getEngineeringMembers = async (req, res) => {
  try {
    const user = req.user;
    const techDeptIds = await getTechDeptIds(user);

    const members = await User.find({
      isDeleted: false,
      status: "active",
      department: { $in: techDeptIds },
      role: { $in: ["manager", "staff", "employee", "c_level"] },
    }).select("fullName email designation role department").populate("department", "name code");

    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
