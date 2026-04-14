const asyncHandler = require("express-async-handler");
const Tools = require("../models/ToolsModel");
const getAllTools = asyncHandler(async (_, res) => {
  const tools = await Tools.find({}, { _id: 1, title: 1, visible: 1, toolName: 1, titleTranslations: 1 }).sort({ createdAt: -1 });;
  const toolsCount = tools.length;
  res.status(200).json({ toolsCount, tools });
});
const getToolById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tool = await Tools.findById(id, { _id: 1, title: 1, visible: 1, toolName: 1 });
  if (!tool) {
    return res.status(404).json({ message: "Tool not found" });
  }
  res.status(200).json(tool);
});
const addNewTool = asyncHandler(async (req, res) => {
  const { title, visible, toolName, titleTranslations } = req.body;

  if (!title || !toolName) {
    res.status(400);
    throw new Error('Please provide both title and toolName.');
  }

  const toolExists = await Tools.findOne({ toolName });
  if (toolExists) {
    return res.status(400).json({
      message: 'A tool with this Tool Name already exists.'
    });
  }

  const tool = await Tools.create({ title, visible, toolName, titleTranslations });
  res.status(201).json(tool);
});

const updateTool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, toolName, visible, titleTranslations } = req.body;
  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (toolName !== undefined) updateData.toolName = toolName;
  if (visible !== undefined) updateData.visible = visible;

  if (titleTranslations !== undefined) updateData.titleTranslations = titleTranslations;

  const updatedTool = await Tools.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

  if (!updatedTool) {
    res.status(404);
    throw new Error('Tool not found');
  }
  res.status(200).json({ result: true, tool: updatedTool });
});
const deleteTool = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Tools.findByIdAndDelete(id);
  res.status(200).json({ result: true });
});
const updateVisibility = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;

  if (typeof visible !== "boolean") {
    return res.status(400).json({ message: "Invalid visibility value" });
  }

  const updatedTool = await Tools.findByIdAndUpdate(
    id,
    { visible },
    { new: true, select: "_id title visible toolName, titleTranslations" }
  );

  if (!updatedTool) {
    return res.status(404).json({ message: "Tool not found" });
  }
  res.status(200).json({ data: { result: true, tool: updatedTool, message: "Tool visibilty updated." } });
});
module.exports = {
  getAllTools,
  getToolById,
  addNewTool,
  updateTool,
  deleteTool,
  updateVisibility,
};