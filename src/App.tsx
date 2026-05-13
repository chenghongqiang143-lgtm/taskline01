/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  CalendarDays,
  CalendarCheck,
  Columns,
  Calendar,
  CalendarRange,
  Compass,
  Plus,
  Settings as SettingsIcon,
  Search,
  CheckCircle2,
  Circle,
  Inbox,
  Clock,
  Repeat,
  ArrowRight,
  TrendingUp,
  Target,
  Rocket,
  PlusCircle,
  ChevronRight,
  LayoutGrid,
  X,
  ChevronLeft,
  AlignLeft,
  Flag,
  Tag,
  Link as LinkIcon,
  ListTodo,
  Trash,
  Check,
  Star,
  RefreshCw,
  Zap,
  Undo2,
  Edit2,
  Trash2,
  Download,
  Upload,
  Database,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Cloud,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "webdav";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

export interface KeyResult {
  id: string;
  name: string;
  tasks: (TodoItem & { important?: boolean })[];
}

export type TabType =
  | "today"
  | "week"
  | "month"
  | "year"
  | "someday"
  | "inbox"
  | "all";

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  category?: string;
  important?: boolean;
  notes?: string;
  subtasks?: SubTask[];
  startDate?: string;
  dueDate?: string;
  linkedKR?: string;
  taskType?: "normal" | "waiting" | "next" | "recurring";
  isScheduled?: boolean;
  targetCount?: number;
  repeatUnit?: "day" | "week" | "month";
  repeatFrequency?: number;
  lastCompletedAt?: string;
}

export interface Goal {
  id: string;
  name: string;
  progress: number;
  category: string;
  date: string;
  startDate?: string;
  color: string;
  keyResults?: KeyResult[];
}

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalType: "month" | "year" | "someday";
  inboxTasks: { id: string; text: string }[];
  initialData?: Goal | null;
  onSave: (
    editedGoal: Omit<Goal, "id" | "progress" | "color"> & { id?: string },
    movedTaskIds: string[],
  ) => void;
  onDelete?: (id: string) => void;
}

const GoalModalComponent: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goalType,
  inboxTasks,
  initialData,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("工作");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [keyResults, setKeyResults] = useState<
    {
      id: string;
      name: string;
      tasks: { id: string; text: string; isExisting: boolean }[];
    }[]
  >([]);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState<string | null>(null);
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCategory(initialData.category);
        setDate(initialData.date);
        setStartDate(initialData.startDate || "");
        if (initialData.keyResults) {
          setKeyResults(
            initialData.keyResults.map((kr) => ({
              id: kr.id,
              name: kr.name,
              tasks: kr.tasks.map((t) => ({
                id: t.id,
                text: t.text,
                isExisting: false,
                important: t.important,
              })),
            })),
          );
        } else {
          setKeyResults([]);
        }
      } else {
        setName("");
        setCategory("工作");
        setStartDate("");
        setDate("");
        setKeyResults([]);
      }
      setIsTaskPickerOpen(null);
      setNewTaskTexts({});
    }
  }, [isOpen, initialData]);

  const handleAddKR = () => {
    setKeyResults([
      ...keyResults,
      { id: `kr-${Date.now()}`, name: "", tasks: [] },
    ]);
  };

  const handleUpdateKRName = (krId: string, krName: string) => {
    setKeyResults(
      keyResults.map((kr) => (kr.id === krId ? { ...kr, name: krName } : kr)),
    );
  };

  const handleDeleteKR = (krId: string) => {
    setKeyResults(keyResults.filter((kr) => kr.id !== krId));
  };

  const handleAddNewTask = (krId: string) => {
    const text = newTaskTexts[krId];
    if (!text || !text.trim()) return;
    setKeyResults(
      keyResults.map((kr) =>
        kr.id === krId
          ? {
              ...kr,
              tasks: [
                ...kr.tasks,
                {
                  id: `tnew-${Date.now()}`,
                  text: text.trim(),
                  isExisting: false,
                },
              ],
            }
          : kr,
      ),
    );
    setNewTaskTexts({ ...newTaskTexts, [krId]: "" });
  };

  const handlePickExistingTask = (
    krId: string,
    task: { id: string; text: string },
  ) => {
    setKeyResults(
      keyResults.map((kr) =>
        kr.id === krId
          ? {
              ...kr,
              tasks: [
                ...kr.tasks,
                { id: task.id, text: task.text, isExisting: true },
              ],
            }
          : kr,
      ),
    );
    setIsTaskPickerOpen(null);
  };

  const handleDeleteTask = (krId: string, taskId: string) => {
    setKeyResults(
      keyResults.map((kr) =>
        kr.id === krId
          ? { ...kr, tasks: kr.tasks.filter((t) => t.id !== taskId) }
          : kr,
      ),
    );
  };

  const handleToggleKRTaskImportant = (krId: string, taskId: string) => {
    setKeyResults(
      keyResults.map((kr) =>
        kr.id === krId
          ? {
              ...kr,
              tasks: kr.tasks.map((t) =>
                t.id === taskId ? { ...t, important: !t.important } : t,
              ),
            }
          : kr,
      ),
    );
  };

  const save = () => {
    if (!name.trim()) return;
    const finalKRs: KeyResult[] = keyResults
      .filter((kr) => kr.name.trim())
      .map((kr) => ({
        ...kr,
        tasks: kr.tasks.map((t) => ({
          id: t.id,
          text: t.text,
          completed: false,
          important: t.important,
        })),
      }));
    const movedIds = keyResults.flatMap((kr) =>
      kr.tasks.filter((t) => t.isExisting).map((t) => t.id),
    );

    let defaultDate = "将来";
    if (goalType === "month") defaultDate = "待定";
    if (goalType === "year") defaultDate = "全年";

    onSave(
      {
        id: initialData?.id,
        name,
        category,
        keyResults: finalKRs,
        date: date || defaultDate,
        startDate,
      },
      movedIds,
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white sm:rounded-lg rounded-t-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-emerald-100/50 bg-emerald-50/50 z-10 sticky top-0">
              <div className="w-8" />
              <h3 className="font-bold text-lg text-emerald-900">
                {initialData ? "编辑" : "新增"}
                {goalType === "week"
                  ? "每周"
                  : goalType === "month"
                    ? "月度"
                    : goalType === "year"
                      ? "年度"
                      : "将来"}
                目标
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-500 hover:text-emerald-900 bg-white shadow-sm border border-emerald-100/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Goal Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  目标名称
                </label>
                <input
                  type="text"
                  placeholder="输入目标名称..."
                  className="w-full bg-white border border-gray-200/60 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Dates Layout */}
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                    开始日期
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white border border-gray-200/60 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm appearance-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* Deadline */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                    截止时间
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white border border-gray-200/60 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm appearance-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  目标分类
                </label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 p-1 bg-gray-100/80 rounded-lg">
                  {["工作", "个人", "健康", "财务", "学习", "旅行", "创意"].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`flex-none px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                          category === cat
                            ? "bg-white text-emerald-600 shadow-sm"
                            : "text-gray-500 hover:text-emerald-600 hover:bg-gray-50/50"
                        }`}
                      >
                        {cat}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Key Results */}
              <div>
                <div className="flex justify-between items-center mb-1.5 pl-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                    关键结果 (KR)
                  </label>
                  <button
                    onClick={handleAddKR}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    <Plus className="w-3 h-3" /> 添加 KR
                  </button>
                </div>

                <div className="space-y-3">
                  {keyResults.map((kr, idx) => (
                    <div
                      key={kr.id}
                      className="bg-white p-3 rounded-lg border border-gray-200/60 shadow-sm relative group"
                    >
                      <button
                        onClick={() => handleDeleteKR(kr.id)}
                        className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex gap-2 mb-3 pr-6">
                        <span className="text-sm font-bold text-gray-300 mt-1">
                          KR{idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="描述具体且可衡量的结果..."
                          className="w-full bg-transparent border-b border-gray-100 focus:border-emerald-500 pb-1.5 outline-none font-medium text-gray-800 placeholder:text-gray-400 text-sm"
                          value={kr.name}
                          onChange={(e) =>
                            handleUpdateKRName(kr.id, e.target.value)
                          }
                        />
                      </div>

                      {/* KR Tasks */}
                      <div className="pl-7 space-y-1.5">
                        {kr.tasks.map((t) => (
                          <div
                            key={t.id}
                            className={`flex justify-between items-center group/task px-2.5 py-1.5 rounded-lg border ${t.important ? "border-yellow-200 bg-yellow-50/50" : "border-gray-100 bg-gray-50"}`}
                          >
                            <span className="text-xs text-gray-700 flex items-center gap-1.5 flex-1">
                              {t.isExisting ? (
                                <LinkIcon className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <ListTodo className="w-3 h-3 text-gray-400" />
                              )}
                              <span className="line-clamp-1">{t.text}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleToggleKRTaskImportant(kr.id, t.id);
                                }}
                                className={`p-0.5 transition-opacity ${t.important ? "text-yellow-500 opacity-100" : "text-gray-400 hover:text-yellow-500 opacity-0 group-hover/task:opacity-100"}`}
                              >
                                <Star
                                  className="w-3.5 h-3.5"
                                  fill={t.important ? "currentColor" : "none"}
                                />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(kr.id, t.id)}
                                className="text-gray-400 hover:text-red-500 p-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            placeholder="新建下一步操作..."
                            className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-gray-400"
                            value={newTaskTexts[kr.id] || ""}
                            onChange={(e) =>
                              setNewTaskTexts({
                                ...newTaskTexts,
                                [kr.id]: e.target.value,
                              })
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleAddNewTask(kr.id)
                            }
                          />
                          <button
                            onClick={() => handleAddNewTask(kr.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3 bg-gray-200"></div>
                          <button
                            onClick={() =>
                              setIsTaskPickerOpen(
                                isTaskPickerOpen === kr.id ? null : kr.id,
                              )
                            }
                            className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Inbox className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Task Picker */}
                        <AnimatePresence>
                          {isTaskPickerOpen === kr.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-1.5"
                            >
                              <div className="bg-gray-50 rounded-lg p-1.5 border border-gray-200/60 max-h-32 overflow-y-auto w-full no-scrollbar">
                                <p className="text-[10px] font-bold text-gray-400 uppercase px-1.5 mb-1">
                                  从收集箱选择:
                                </p>
                                {inboxTasks
                                  .filter(
                                    (it) =>
                                      !kr.tasks.some((t) => t.id === it.id),
                                  )
                                  .map((task) => (
                                    <button
                                      key={task.id}
                                      onClick={() =>
                                        handlePickExistingTask(kr.id, task)
                                      }
                                      className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 transition-all truncate"
                                    >
                                      {task.text}
                                    </button>
                                  ))}
                                {inboxTasks.filter(
                                  (it) => !kr.tasks.some((t) => t.id === it.id),
                                ).length === 0 && (
                                  <p className="text-xs text-gray-500 italic p-1.5">
                                    收集箱为空
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}

                  {keyResults.length === 0 && (
                    <button
                      onClick={handleAddKR}
                      className="w-full border border-dashed border-gray-300 bg-gray-50/50 rounded-lg p-4 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors group"
                    >
                      <Target className="w-5 h-5 text-gray-300 mx-auto mb-1.5 group-hover:text-gray-400 transition-colors" />
                      <p className="text-xs font-bold text-gray-500 group-hover:text-gray-600 transition-colors">
                        添加关键结果 (KR)
                      </p>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50/80 border-t border-gray-100/80 shrink-0">
              {initialData ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (
                        onDelete &&
                        initialData?.id &&
                        window.confirm("确定要删除这个目标吗？")
                      ) {
                        onDelete(initialData.id);
                        onClose();
                      }
                    }}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-lg font-bold text-sm transition-colors border border-red-100 shadow-sm bg-white shrink-0"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                  <button
                    onClick={save}
                    disabled={!name.trim()}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    保存修改 <Check className="w-4 h-4 text-emerald-100" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={save}
                    disabled={!name.trim()}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    确认创建 <Check className="w-4 h-4 text-emerald-100" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// PressableItem component for long-press functionality
const PressableItem = ({
  children,
  onLongPress,
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
  onLongPress: () => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  [key: string]: any;
}) => {
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = React.useRef(false);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isLongPressActive.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      onLongPress();
    }, 500);
  };

  const handleStop = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (onClick) onClick(e);
  };

  return (
    <div
      className={className}
      onMouseDown={handleStart}
      onMouseUp={handleStop}
      onMouseLeave={handleStop}
      onTouchStart={handleStart}
      onTouchEnd={handleStop}
      onClick={handleClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("today");
  const [newTaskValue, setNewTaskValue] = useState("");
  const [inboxValue, setInboxValue] = useState("");
  const [inboxTasks, setInboxTasks] = useState<TodoItem[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // New Task Modal States
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskStep, setNewTaskStep] = useState(1);
  const [editTaskStep, setEditTaskStep] = useState(1);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showBatchCategoryModal, setShowBatchCategoryModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    name: "",
    category: "工作",
    notes: "",
    subtasks: [] as SubTask[],
    type: "下一步", // 等待, 下一步, 重复事项
    targetCount: 1,
    repeatUnit: "day" as "day" | "week" | "month",
    repeatFrequency: 1,
    startDate: "",
    dueDate: "",
    linkedKR: "",
  });

  // States for Today page tasks
  const [scheduledTasks, setScheduledTasks] = useState<TodoItem[]>([
    { id: "st-1", text: "早晨瑜伽", completed: false },
    { id: "st-2", text: "项目周报", completed: false },
    { id: "st-3", text: "预约医生", completed: false },
  ]);
  const [addingScheduled, setAddingScheduled] = useState(false);
  const [newScheduled, setNewScheduled] = useState("");
  const [addingInbox, setAddingInbox] = useState(false);
  const [newInbox, setNewInbox] = useState("");

  const [tempTasks, setTempTasks] = useState<TodoItem[]>([
    { id: "tt-1", text: "缴纳电费", completed: false },
    { id: "tt-2", text: "归还书籍", completed: false },
  ]);
  const [addingTemp, setAddingTemp] = useState(false);
  const [newTemp, setNewTemp] = useState("");

  const [habits, setHabits] = useState<TodoItem[]>([
    { id: "h-1", text: "每日阅读", completed: false },
    { id: "h-2", text: "多喝水", completed: false },
    { id: "h-3", text: "冥想", completed: false },
    { id: "h-4", text: "早起", completed: false },
    { id: "h-5", text: "锻炼", completed: false },
    { id: "h-6", text: "减少糖分", completed: false },
    { id: "h-7", text: "写日志", completed: false },
  ]);
  const [showAllHabits, setShowAllHabits] = useState(false);

  // Timeline Tasks Flow
  const [selectedHourForPlan, setSelectedHourForPlan] = useState<number | null>(
    null,
  );
  const [plannedTasks, setPlannedTasks] = useState<
    {
      id: string;
      hour: number;
      text: string;
      completed: boolean;
      taskType?: "normal" | "waiting" | "next" | "recurring";
    }[]
  >([
    { id: "pt-1", hour: 8, text: "核心代码开发", completed: false },
    { id: "pt-2", hour: 11, text: "团队同步会议", completed: false },
  ]);
  const [actualTasks, setActualTasks] = useState<
    { id: string; hour: number; text: string }[]
  >([
    { id: "at-1", hour: 8, text: "代码开发 (推迟)" },
    { id: "at-2", hour: 11, text: "会议 & 问题讨论" },
  ]);

  const handleTaskClickForPlan = (text: string) => {
    if (selectedHourForPlan !== null) {
      setPlannedTasks([
        ...plannedTasks,
        {
          id: `pt-${Date.now()}`,
          hour: selectedHourForPlan,
          text,
          completed: false,
        },
      ]);
      setSelectedHourForPlan(null);
    }
  };

  const handleCompleteTask = (
    text: string,
    isPlanned: boolean,
    taskId?: string,
  ) => {
    const currentHour = new Date().getHours();

    // Add to actual tasks if not already added for this hour/text (simple dedupe)
    if (
      !actualTasks.some((at) => at.hour === currentHour && at.text === text)
    ) {
      setActualTasks([
        ...actualTasks,
        { id: `at-${Date.now()}`, hour: currentHour, text },
      ]);
    }

    if (isPlanned && taskId) {
      setPlannedTasks(
        plannedTasks.map((pt) => {
          if (pt.id === taskId) {
            const isCompleting = !pt.completed;
            const now = new Date();
            const timeStr = `${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
            return {
              ...pt,
              completed: isCompleting,
              lastCompletedAt: isCompleting ? timeStr : pt.lastCompletedAt,
            };
          }
          return pt;
        }),
      );
    } else {
      // Toggle completion for all applicable lists
      const toggle = (list: TodoItem[]) =>
        list.map((t) => {
          if (t.text === text) {
            const isCompleting = !t.completed;
            const now = new Date();
            const timeStr = `${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
            return {
              ...t,
              completed: isCompleting,
              lastCompletedAt: isCompleting ? timeStr : t.lastCompletedAt,
            };
          }
          return t;
        });

      if (scheduledTasks.some((t) => t.text === text)) {
        setScheduledTasks(toggle(scheduledTasks));
      } else if (tempTasks.some((t) => t.text === text)) {
        setTempTasks(toggle(tempTasks));
      } else if (habits.some((t) => t.text === text)) {
        setHabits(toggle(habits));
      } else if (weekNextTasks.some((t) => t.text === text)) {
        setWeekNextTasks(toggle(weekNextTasks));
      } else if (weekWaitTasks.some((t) => t.text === text)) {
        setWeekWaitTasks(toggle(weekWaitTasks));
      } else if (weekRepeatTasks.some((t) => t.text === text)) {
        setWeekRepeatTasks(toggle(weekRepeatTasks));
      }

      // Update weekTasksByDay
      const nextWeekTasksByDay = { ...weekTasksByDay };
      let weekUpdated = false;
      Object.keys(nextWeekTasksByDay).forEach((key) => {
        const dIdx = Number(key);
        if (nextWeekTasksByDay[dIdx].some((t) => t.text === text)) {
          nextWeekTasksByDay[dIdx] = toggle(nextWeekTasksByDay[dIdx]);
          weekUpdated = true;
        }
      });
      if (weekUpdated) setWeekTasksByDay(nextWeekTasksByDay);

      // Sync with Goal KRs if the task text matches (best effort sync)
      const syncCheck = (goals: Goal[]) =>
        goals.map((g) => ({
          ...g,
          keyResults: g.keyResults?.map((kr) => ({
            ...kr,
            tasks: kr.tasks.map((t) =>
              t.text === text ? { ...t, completed: !t.completed } : t,
            ),
          })),
        }));
      setMonthGoals(syncCheck(monthGoals));
      setYearGoals(syncCheck(yearGoals));
      setSomedayGoals(syncCheck(somedayGoals));
    }
  };

  const toggleKRTask = (
    goalType: "week" | "month" | "year" | "someday",
    goalId: string,
    krId: string,
    taskId: string,
  ) => {
    const setter =
      goalType === "week"
        ? setWeekGoals
        : goalType === "month"
          ? setMonthGoals
          : goalType === "year"
            ? setYearGoals
            : setSomedayGoals;
    const goals =
      goalType === "week"
        ? weekGoals
        : goalType === "month"
          ? monthGoals
          : goalType === "year"
            ? yearGoals
            : somedayGoals;

    const newGoals = goals.map((goal) => {
      if (goal.id !== goalId) return goal;

      const newKRs = goal.keyResults?.map((kr) => {
        if (kr.id !== krId) return kr;
        const newTasks = kr.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t,
        );
        return { ...kr, tasks: newTasks };
      });

      // Recalculate progress based on KR tasks
      const allTasks = newKRs?.flatMap((kr) => kr.tasks) || [];
      const completedTasks = allTasks.filter((t) => t.completed).length;
      const progress =
        allTasks.length > 0
          ? Math.round((completedTasks / allTasks.length) * 100)
          : goal.progress;

      return { ...goal, keyResults: newKRs, progress };
    });

    setter(newGoals);
  };

  const toggleTaskImportant = (id: string) => {
    const updateImportant = (list: any[]) =>
      list.map((t) => (t.id === id ? { ...t, important: !t.important } : t));
    setScheduledTasks(updateImportant(scheduledTasks));
    setTempTasks(updateImportant(tempTasks));
    setPlannedTasks(updateImportant(plannedTasks));
    setMonthTasks(updateImportant(monthTasks));
    setYearTasks(updateImportant(yearTasks));
    setSomedayTasks(updateImportant(somedayTasks));
  };

  const toggleItemCompletion = (
    type: "month" | "year" | "someday",
    id: string,
  ) => {
    if (type === "month") {
      setMonthTasks(
        monthTasks.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        ),
      );
    } else if (type === "year") {
      setYearTasks(
        yearTasks.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        ),
      );
    } else if (type === "someday") {
      setSomedayTasks(
        somedayTasks.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        ),
      );
    }
  };

  // Archive flow states
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);
  const [archiveActionable, setArchiveActionable] = useState<boolean | null>(
    null,
  );
  const [archive2Min, setArchive2Min] = useState<boolean | null>(null);
  const [archiveCategory, setArchiveCategory] = useState<string>("工作");

  // Target task lists (for demonstration of archiving)
  const [weekWaitTasks, setWeekWaitTasks] = useState<TodoItem[]>([
    {
      id: "ww-1",
      text: "确认团队会议议程",
      completed: false,
      dueDate: "2026-05-12",
      lastCompletedAt: "2026-05-05 14:00",
    },
  ]);
  const [weekRepeatTasks, setWeekRepeatTasks] = useState<TodoItem[]>([
    {
      id: "wr-1",
      text: "更新博客内容",
      completed: false,
      repeatUnit: "day",
      repeatFrequency: 1,
      isScheduled: true,
      lastCompletedAt: "2026-05-10 20:00",
    },
    {
      id: "wr-2",
      text: "每周财务对账",
      completed: false,
      repeatUnit: "week",
      repeatFrequency: 1,
      lastCompletedAt: "2025-05-04 10:00",
    },
  ]);
  const [weekNextTasks, setWeekNextTasks] = useState<TodoItem[]>([
    { id: "wn-1", text: "制定下季度市场计划", completed: false },
  ]);
  const [weekTab, setWeekTab] = useState("全部");
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekSelectedDay, setWeekSelectedDay] = useState<number | null>(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });
  const [weekTasksByDay, setWeekTasksByDay] = useState<
    Record<number, TodoItem[]>
  >({});
  const [goalsTab, setGoalsTab] = useState("全部");
  const [somedayTab, setSomedayTab] = useState("全部");
  const [allTasksTab, setAllTasksTab] = useState("全部");
  const [userCategories, setUserCategories] = useState([
    "工作",
    "个人",
    "健康",
    "家庭",
    "财务",
    "学习",
    "社交",
    "兴趣",
  ]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const [monthTasks, setMonthTasks] = useState<TodoItem[]>([]);
  const [yearTasks, setYearTasks] = useState<TodoItem[]>([]);
  const [somedayTasks, setSomedayTasks] = useState<TodoItem[]>([
    { id: "sd-1", text: "探索日本古寺庙", completed: false },
    { id: "sd-2", text: "出版一本技术小说", completed: false },
    { id: "sd-3", text: "深入研究量子计算", completed: false },
  ]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [lastReviewDate] = useState<Date>(new Date(2026, 4, 8)); // 5月8日

  // Settings & Pomodoro State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pomodoroTask, setPomodoroTask] = useState<TodoItem | null>(null);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [isPomodoroBreak, setIsPomodoroBreak] = useState(false);
  const [webdavConfig, setWebdavConfig] = useState({
    url: "",
    username: "",
    password: "",
  });

  // Pomodoro Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPomodoroActive && pomodoroTimeLeft > 0) {
      interval = setInterval(() => {
        setPomodoroTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (pomodoroTimeLeft === 0) {
      setIsPomodoroActive(false);
      // Bell/Notification?
      if (!isPomodoroBreak) {
        // Switch to break
        if (window.confirm("工作时间结束！开始休息吗？")) {
          setIsPomodoroBreak(true);
          setPomodoroTimeLeft(5 * 60);
          setIsPomodoroActive(true);
        }
      } else {
        if (window.confirm("休息结束！继续工作吗？")) {
          setIsPomodoroBreak(false);
          setPomodoroTimeLeft(25 * 60);
          setIsPomodoroActive(true);
        }
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomodoroActive, pomodoroTimeLeft, isPomodoroBreak]);

  const startPomodoro = (task: TodoItem) => {
    setPomodoroTask(task);
    setPomodoroTimeLeft(25 * 60);
    setIsPomodoroActive(true);
    setIsPomodoroBreak(false);
  };

  const handleClearContent = () => {
    if (window.confirm("确定要清除所有内容吗？模板和分类将被保留。")) {
      setInboxTasks([]);
      setScheduledTasks([]);
      setTempTasks([]);
      setPlannedTasks([]);
      setHabits([]);
      setWeekWaitTasks([]);
      setWeekRepeatTasks([]);
      setWeekNextTasks([]);
      setMonthTasks([]);
      setYearTasks([]);
      setSomedayTasks([]);
      setMonthGoals([]);
      setWeekGoals([]);
      setYearGoals([]);
      setSomedayGoals([]);
      // keep userCategories
    }
  };

  const handleExportData = async () => {
    const data = {
      inboxTasks,
      scheduledTasks,
      tempTasks,
      plannedTasks,
      habits,
      weekWaitTasks,
      weekRepeatTasks,
      weekNextTasks,
      monthTasks,
      yearTasks,
      somedayTasks,
      monthGoals,
      weekGoals,
      yearGoals,
      somedayGoals,
      userCategories,
    };
    const json = JSON.stringify(data, null, 2);

    if (Capacitor.isNativePlatform()) {
      try {
        const fileName = `task_export_${new Date().getTime()}.json`;
        await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        const uri = await Filesystem.getUri({
          directory: Directory.Documents,
          path: fileName,
        });
        await Share.share({
          title: "导出数据",
          text: "我的任务导出数据",
          url: uri.uri,
          dialogTitle: "导出数据",
        });
      } catch (e) {
        console.error("Export error", e);
        alert("导出失败");
      }
    } else {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `task_export_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.inboxTasks) setInboxTasks(data.inboxTasks);
        if (data.scheduledTasks) setScheduledTasks(data.scheduledTasks);
        if (data.tempTasks) setTempTasks(data.tempTasks);
        if (data.plannedTasks) setPlannedTasks(data.plannedTasks);
        if (data.habits) setHabits(data.habits);
        if (data.weekWaitTasks) setWeekWaitTasks(data.weekWaitTasks);
        if (data.weekRepeatTasks) setWeekRepeatTasks(data.weekRepeatTasks);
        if (data.weekNextTasks) setWeekNextTasks(data.weekNextTasks);
        if (data.monthTasks) setMonthTasks(data.monthTasks);
        if (data.yearTasks) setYearTasks(data.yearTasks);
        if (data.somedayTasks) setSomedayTasks(data.somedayTasks);
        if (data.monthGoals) setMonthGoals(data.monthGoals);
        if (data.weekGoals) setWeekGoals(data.weekGoals);
        if (data.yearGoals) setYearGoals(data.yearGoals);
        if (data.somedayGoals) setSomedayGoals(data.somedayGoals);
        if (data.userCategories) setUserCategories(data.userCategories);
        alert("导入成功");
      } catch (e) {
        console.error("Import error", e);
        alert("导入失败，格式错误");
      }
    };
    reader.readAsText(file);
  };

  const handleWebDAVSync = async () => {
    if (!webdavConfig.url || !webdavConfig.username || !webdavConfig.password) {
      alert("请先设置 WebDAV 配置");
      return;
    }
    const client = createClient(webdavConfig.url, {
      username: webdavConfig.username,
      password: webdavConfig.password,
    });

    const data = {
      inboxTasks,
      scheduledTasks,
      tempTasks,
      plannedTasks,
      habits,
      weekWaitTasks,
      weekRepeatTasks,
      weekNextTasks,
      monthTasks,
      yearTasks,
      somedayTasks,
      monthGoals,
      yearGoals,
      somedayGoals,
      userCategories,
    };
    const json = JSON.stringify(data);

    try {
      await client.putFileContents("/task_sync.json", json);
      alert("同步成功");
    } catch (e) {
      console.error("WebDAV sync error", e);
      alert("同步失败");
    }
  };

  const daysSinceLastReview = useMemo(() => {
    const today = new Date();
    const diffTime = today.getTime() - lastReviewDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [lastReviewDate]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalType, setGoalType] = useState<"week" | "month" | "year" | "someday">("month");
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());

  const toggleGoalExpand = (id: string) => {
    const newSet = new Set(expandedGoalIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedGoalIds(newSet);
  };

  const [actionSheetConfig, setActionSheetConfig] = useState<{
    id: string;
    title: string;
    onEdit: () => void;
    onDelete: () => void;
  } | null>(null);
  const [newGoal, setNewGoal] = useState({
    name: "",
    category: "",
    keyResults: "",
  });

  // Goal states
  const [monthGoals, setMonthGoals] = useState<Goal[]>([
    {
      id: "mg-1",
      name: "个人品牌视觉迭代",
      progress: 65,
      date: "5月24日",
      category: "工作",
      color: "emerald",
    },
    {
      id: "mg-2",
      name: "季度市场调研报告",
      progress: 15,
      date: "5月31日",
      category: "工作",
      color: "orange",
    },
    {
      id: "mg-3",
      name: "智能家居自动化系统",
      progress: 90,
      date: "5月15日",
      category: "个人",
      color: "emerald",
    },
  ]);
  const [yearGoals, setYearGoals] = useState<Goal[]>([
    {
      id: "yg-1",
      name: "核心技术选型与原型验证",
      progress: 100,
      date: "Q1",
      category: "工作",
      color: "emerald",
    },
    {
      id: "yg-2",
      name: "分布式系统核心模块开发",
      progress: 40,
      date: "Q2",
      category: "工作",
      color: "emerald",
    },
  ]);
  const [weekGoals, setWeekGoals] = useState<Goal[]>([]);
  const [somedayGoals, setSomedayGoals] = useState<Goal[]>([
    {
      id: "sd-1",
      name: "探索日本古寺庙",
      progress: 0,
      date: "将来",
      category: "旅行",
      color: "emerald",
    },
    {
      id: "sd-2",
      name: "出版一本技术小说",
      progress: 0,
      date: "将来",
      category: "创意",
      color: "emerald",
    },
  ]);

  // Edit Task Modal States
  const [editingTask, setEditingTask] = useState<
    | (TodoItem & {
        type:
          | "scheduled"
          | "temp"
          | "habit"
          | "planned"
          | "inbox"
          | "month"
          | "year"
          | "someday"
          | "week_wait"
          | "week_repeat"
          | "week_next"
          | "week_day";
        dayIndex?: number;
        originalIndex?: number;
      })
    | null
  >(null);

  // Cleanup steps on close
  useEffect(() => {
    if (!isNewTaskModalOpen) setNewTaskStep(1);
  }, [isNewTaskModalOpen]);

  useEffect(() => {
    if (!editingTask) setEditTaskStep(1);
  }, [editingTask]);

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    const updateSubtasks = (list: TodoItem[]) =>
      list.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: t.subtasks?.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st,
          ),
        };
      });

    setInboxTasks(updateSubtasks(inboxTasks));
    setScheduledTasks(updateSubtasks(scheduledTasks));
    setTempTasks(updateSubtasks(tempTasks));
    setWeekWaitTasks(updateSubtasks(weekWaitTasks));
    setWeekRepeatTasks(updateSubtasks(weekRepeatTasks));
    setWeekNextTasks(updateSubtasks(weekNextTasks));
    setPlannedTasks(
      plannedTasks.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          subtasks: (t as any).subtasks?.map((st: SubTask) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st,
          ),
        };
      }) as any,
    );

    // Update tasks in weekTasksByDay
    const nextWeekTasksByDay = { ...weekTasksByDay };
    Object.keys(nextWeekTasksByDay).forEach((key) => {
      const dayIndex = parseInt(key);
      nextWeekTasksByDay[dayIndex] = updateSubtasks(
        nextWeekTasksByDay[dayIndex],
      );
    });
    setWeekTasksByDay(nextWeekTasksByDay);
  };

  const toggleTaskExpansion = (taskId: string) => {
    const next = new Set(expandedTasks);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    setExpandedTasks(next);
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const handleBatchDelete = () => {
    if (selectedTasks.length === 0) return;
    const filterOutSelected = (list: TodoItem[]) =>
      list.filter((t) => !selectedTasks.includes(t.id));

    setScheduledTasks(filterOutSelected(scheduledTasks));
    setTempTasks(filterOutSelected(tempTasks));
    setHabits(filterOutSelected(habits));
    setPlannedTasks(filterOutSelected(plannedTasks as TodoItem[]) as any);
    setInboxTasks(filterOutSelected(inboxTasks));
    setMonthTasks(filterOutSelected(monthTasks));
    setYearTasks(filterOutSelected(yearTasks));
    setSomedayTasks(filterOutSelected(somedayTasks));
    setWeekWaitTasks(filterOutSelected(weekWaitTasks));
    setWeekRepeatTasks(filterOutSelected(weekRepeatTasks));
    setWeekNextTasks(filterOutSelected(weekNextTasks));

    // Also update routine tasks if needed
    setRoutines(
      routines.map((r) => ({
        ...r,
        tasks: filterOutSelected(r.tasks),
      }))
    );

    setSelectedTasks([]);
    setIsSelectionMode(false);
  };

  const handleBatchMoveToCategory = (categoryName: string) => {
    if (selectedTasks.length === 0) return;
    const updateSelected = (list: TodoItem[]) =>
      list.map((t) =>
        selectedTasks.includes(t.id) ? { ...t, category: categoryName } : t,
      );

    setScheduledTasks(updateSelected(scheduledTasks));
    setTempTasks(updateSelected(tempTasks));
    setHabits(updateSelected(habits));
    setPlannedTasks(updateSelected(plannedTasks as TodoItem[]) as any);
    setInboxTasks(updateSelected(inboxTasks));
    setMonthTasks(updateSelected(monthTasks));
    setYearTasks(updateSelected(yearTasks));
    setSomedayTasks(updateSelected(somedayTasks));
    setWeekWaitTasks(updateSelected(weekWaitTasks));
    setWeekRepeatTasks(updateSelected(weekRepeatTasks));
    setWeekNextTasks(updateSelected(weekNextTasks));

    setRoutines(
      routines.map((r) => ({
        ...r,
        tasks: updateSelected(r.tasks),
      }))
    );

    setShowBatchCategoryModal(false);
    setSelectedTasks([]);
    setIsSelectionMode(false);
  };

  const handleToggleTaskImportant = (
    type: string,
    taskId: string,
    dayIndex?: number,
    routineId?: string,
  ) => {
    const toggleImportant = (list: TodoItem[]) =>
      list.map((t) =>
        t.id === taskId ? { ...t, important: !t.important } : t,
      );

    if (type === "scheduled") {
      setScheduledTasks(toggleImportant(scheduledTasks));
    } else if (type === "temp") {
      setTempTasks(toggleImportant(tempTasks));
    } else if (type === "habit") {
      setHabits(toggleImportant(habits));
    } else if (type === "planned") {
      setPlannedTasks(
        plannedTasks.map((t) =>
          t.id === taskId ? ({ ...t, important: !t.important } as any) : t,
        ),
      );
    } else if (type === "inbox") {
      setInboxTasks(toggleImportant(inboxTasks));
    } else if (type === "month") {
      setMonthTasks(toggleImportant(monthTasks));
    } else if (type === "year") {
      setYearTasks(toggleImportant(yearTasks));
    } else if (type === "someday") {
      setSomedayTasks(toggleImportant(somedayTasks));
    } else if (type === "week_wait") {
      setWeekWaitTasks(toggleImportant(weekWaitTasks));
    } else if (type === "week_repeat") {
      setWeekRepeatTasks(toggleImportant(weekRepeatTasks));
    } else if (type === "week_next") {
      setWeekNextTasks(toggleImportant(weekNextTasks));
    } else if (type === "routine" && routineId) {
      setRoutines(
        routines.map((r) =>
          r.id === routineId
            ? {
                ...r,
                tasks: r.tasks.map((t) =>
                  t.id === taskId ? { ...t, important: !t.important } : t,
                ),
              }
            : r,
        ),
      );
    }
  };

  const handleUpdateTask = (updatedTask: TodoItem) => {
    if (!editingTask) return;
    const { type, id, dayIndex } = editingTask;

    const findAndUpdate = (list: TodoItem[]) =>
      list.map((t) => (t.id === id ? { ...t, ...updatedTask } : t));

    if (type === "scheduled") {
      setScheduledTasks(findAndUpdate(scheduledTasks));
    } else if (type === "temp") {
      setTempTasks(findAndUpdate(tempTasks));
    } else if (type === "habit") {
      setHabits(findAndUpdate(habits));
    } else if (type === "planned") {
      setPlannedTasks(
        plannedTasks.map((t) =>
          t.id === id ? ({ ...t, ...updatedTask } as any) : t,
        ),
      );
    } else if (type === "inbox") {
      setInboxTasks(findAndUpdate(inboxTasks));
    } else if (type === "month") {
      setMonthTasks(findAndUpdate(monthTasks));
    } else if (type === "year") {
      setYearTasks(findAndUpdate(yearTasks));
    } else if (type === "someday") {
      setSomedayTasks(findAndUpdate(somedayTasks));
    } else if (type === "week_wait") {
      setWeekWaitTasks(findAndUpdate(weekWaitTasks));
    } else if (type === "week_repeat") {
      setWeekRepeatTasks(findAndUpdate(weekRepeatTasks));
    } else if (type === "week_next") {
      setWeekNextTasks(findAndUpdate(weekNextTasks));
    } else if (type === "week_day" && dayIndex !== undefined) {
      setWeekTasksByDay({
        ...weekTasksByDay,
        [dayIndex]: findAndUpdate(weekTasksByDay[dayIndex] || []),
      });
    }
    setEditingTask(null);
  };

  const deleteTaskById = (id: string, type: string, dayIndex?: number) => {
    if (type === "scheduled")
      setScheduledTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "temp")
      setTempTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "habit") setHabits((prev) => prev.filter((t) => t.id !== id));
    else if (type === "planned")
      setPlannedTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "inbox")
      setInboxTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "month")
      setMonthTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "year")
      setYearTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "someday")
      setSomedayTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "week_wait")
      setWeekWaitTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "week_repeat")
      setWeekRepeatTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "week_next")
      setWeekNextTasks((prev) => prev.filter((t) => t.id !== id));
    else if (type === "week_day" && dayIndex !== undefined) {
      setWeekTasksByDay((prev) => ({
        ...prev,
        [dayIndex]: (prev[dayIndex] || []).filter((t) => t.id !== id),
      }));
    }
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    deleteTaskById(editingTask.id, editingTask.type, editingTask.dayIndex);
    setEditingTask(null);
  };

  const openTaskActionSheet = (task: TodoItem, type: string, dayIndex?: number) => {
    setActionSheetConfig({
      id: task.id,
      title: task.text,
      onEdit: () => setEditingTask({ ...task, type: type as any, dayIndex }),
      onDelete: () => {
        if (window.confirm("确定要彻底删除该任务吗？")) {
          deleteTaskById(task.id, type, dayIndex);
        }
      },
    });
  };

  const handleArchiveTo = (
    task: { id: string; text: string },
    destination: string,
    category?: string,
  ) => {
    setInboxTasks(inboxTasks.filter((t) => t.id !== task.id));

    const base: TodoItem = {
      id: `${destination}-${Date.now()}`,
      text: task.text,
      completed: false,
      category: category || archiveCategory,
    };

    if (destination === "temp") setTempTasks([...tempTasks, base]);
    else if (destination === "wait") setWeekWaitTasks([...weekWaitTasks, base]);
    else if (destination === "repeat")
      setWeekRepeatTasks([...weekRepeatTasks, base]);
    else if (destination === "month") setMonthTasks([...monthTasks, base]);
    else if (destination === "year") setYearTasks([...yearTasks, base]);
    else if (destination === "someday")
      setSomedayTasks([...somedayTasks, base]);

    setArchivingTaskId(null);
    setArchiveActionable(null);
    setArchive2Min(null);
  };

  const handleAddInboxTask = () => {
    if (!inboxValue.trim()) return;
    const newTask: TodoItem = {
      id: `in-${Date.now()}`,
      text: inboxValue,
      completed: false,
    };
    setInboxTasks([newTask, ...inboxTasks]);
    setInboxValue("");
  };

  const handleDeleteInboxTask = (id: string) => {
    setInboxTasks(inboxTasks.filter((task) => task.id !== id));
  };

  const renderTaskRow = (task: TodoItem, type: string, onToggle: () => void) => {
    let taskType = type;
    if (type === "all") {
      if (scheduledTasks.some(t => t.id === task.id)) taskType = "scheduled";
      else if (tempTasks.some(t => t.id === task.id)) taskType = "temp";
      else if (inboxTasks.some(t => t.id === task.id)) taskType = "inbox";
      else if (monthTasks.some(t => t.id === task.id)) taskType = "month";
      else if (yearTasks.some(t => t.id === task.id)) taskType = "year";
      else if (somedayTasks.some(t => t.id === task.id)) taskType = "someday";
      else if (weekWaitTasks.some(t => t.id === task.id)) taskType = "week_wait";
      else if (weekRepeatTasks.some(t => t.id === task.id)) taskType = "week_repeat";
      else if (weekNextTasks.some(t => t.id === task.id)) taskType = "week_next";
      else if (habits.some(t => t.id === task.id)) taskType = "habit";
    }

    return (
      <div
        key={task.id}
        onClick={() => isSelectionMode ? toggleTaskSelection(task.id) : setEditingTask({ ...task, type: taskType as any })}
        className={`p-3 group cursor-pointer hover:ring-1 transition-all flex items-center gap-3 rounded-xl shadow-sm relative overflow-hidden ${
          isSelectionMode && selectedTasks.includes(task.id) ? 'ring-2 ring-emerald-500 bg-emerald-50 border-transparent' : 'bg-white hover:ring-emerald-500/20 border border-gray-100'
        }`}
      >
        {isSelectionMode ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskSelection(task.id);
            }}
            className="flex-shrink-0 mr-1"
          >
            {selectedTasks.includes(task.id) ? (
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
            )}
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex-shrink-0"
          >
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <div className="w-5 h-5 rounded-md border-2 border-gray-300 group-hover:border-emerald-500 transition-colors"></div>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0 flex flex-col pr-6">
          <span className={`text-[13px] font-bold text-gray-800 truncate block ${task.completed ? "line-through text-gray-400 font-medium" : ""}`}>
            {task.text}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded leading-none border border-gray-100">
              {task.category || "未分类"}
            </span>
            {task.dueDate && (
              <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                <Calendar className="w-3 h-3" />
                {task.dueDate}
              </span>
            )}
          </div>
        </div>

        {task.taskType === "waiting" && (
          <div className="absolute top-1.5 right-10 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-sm z-10 scale-90">
            <Clock className="w-2 h-2 text-amber-500" />
            <span className="text-[7px] font-bold text-amber-600 uppercase">等待</span>
          </div>
        )}
        {task.taskType === "next" && (
          <div className="absolute top-1.5 right-10 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 shadow-sm z-10 scale-90">
            <Zap className="w-2 h-2 text-blue-500" />
            <span className="text-[7px] font-bold text-blue-600 uppercase">下一步</span>
          </div>
        )}

        <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/90 pl-1 ${isSelectionMode ? 'opacity-50 pointer-events-none' : ''}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTaskImportant(taskType, task.id);
            }}
            className={`p-1.5 rounded-full hover:bg-yellow-50 transition-colors ${task.important ? 'text-yellow-500 bg-yellow-50/50' : 'text-gray-300 hover:text-yellow-400'}`}
          >
            <Star className={`w-4 h-4 ${task.important ? 'fill-yellow-500' : ''}`} />
          </button>
        </div>
      </div>
    );
  };

  const renderToday = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Timeline Section */}
      <section className="relative -mx-2 px-2 pb-72">
        <header className="flex justify-between items-end mb-5 px-2">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              今日
            </h2>
            <p className="text-gray-400 text-xs font-bold mt-0.5">
              {new Date().toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
              })} · 星期{["日", "一", "二", "三", "四", "五", "六"][new Date().getDay()]}
            </p>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 bg-white hover:bg-gray-50 text-gray-400 hover:text-emerald-600 rounded-xl border border-gray-100 shadow-sm transition-all active:scale-95"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="space-y-0 pt-2 border-t border-gray-200">
          {[
            6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
            24,
          ].map((hour) => {
            const isSelected = selectedHourForPlan === hour;
              const hourTasks = plannedTasks.filter((pt) => pt.hour === hour);
              const displayHour = hour < 10 ? `0${hour}` : hour;

              return (
                <div
                  key={hour}
                  className="flex group relative min-h-[48px] border-b border-gray-200 last:border-b-0"
                >
                  {/* Time column (Now clickable) */}
                  <div
                    className={`w-[3.5rem] pr-2 text-right pt-2 border-r border-gray-200 cursor-pointer transition-colors ${isSelected ? "bg-emerald-100 border-r-emerald-400" : "hover:bg-gray-50/50"}`}
                    onClick={() =>
                      setSelectedHourForPlan(isSelected ? null : hour)
                    }
                  >
                    <span
                      className={`text-[11px] font-bold transition-all duration-200 ${isSelected ? "text-emerald-700 scale-110 inline-block drop-shadow-sm" : "text-gray-400 group-hover:text-gray-700"}`}
                    >
                      {displayHour}:00
                    </span>
                  </div>

                  {/* Plan column */}
                  <div
                    className={`flex-1 relative cursor-pointer transition-all duration-200 flex flex-col p-1 gap-1
                    ${isSelected ? "bg-emerald-50/80 ring-2 ring-inset ring-emerald-300 z-10" : "hover:bg-gray-50/30"}
                  `}
                    onClick={() =>
                      setSelectedHourForPlan(
                        selectedHourForPlan === hour ? null : hour,
                      )
                    }
                  >
                    {hourTasks.map((pt) => (
                      <PressableItem
                        key={pt.id}
                        onLongPress={() => openTaskActionSheet(pt, "planned")}
                        onClick={(e) => e.stopPropagation()}
                        className={`w-full bg-emerald-100/80 backdrop-blur-md border border-emerald-200 rounded p-2 items-center flex shadow-sm transition-all group relative ${pt.completed ? "opacity-40 grayscale" : "hover:scale-[1.01] hover:shadow-md hover:bg-emerald-100"}`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteTask(pt.text, true, pt.id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          className="mr-2 flex-shrink-0"
                        >
                          {pt.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-emerald-600/40 hover:text-emerald-600 transition-colors" />
                          )}
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-[11px] font-bold text-emerald-900 leading-tight ${pt.completed ? "line-through opacity-50" : ""}`}
                          >
                            {pt.text}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {pt.startDate && (
                              <span className="text-[8px] text-blue-700/60 font-bold bg-blue-50 px-1 rounded flex items-center gap-0.5">
                                <CalendarDays className="w-2 h-2" />
                                {pt.startDate} 开始
                              </span>
                            )}
                            {pt.dueDate && (
                              <span className="text-[8px] text-orange-700/60 font-bold bg-orange-50 px-1 rounded flex items-center gap-0.5">
                                <Calendar className="w-2 h-2" />
                                {pt.dueDate} 截止
                              </span>
                            )}
                          </div>
                        </div>
                        {pt.taskType === "waiting" && (
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-sm z-10">
                            <Clock className="w-2 h-2 text-amber-500" />
                            <span className="text-[7px] font-bold text-amber-600 uppercase">等待</span>
                          </div>
                        )}
                        {pt.taskType === "next" && (
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 shadow-sm z-10">
                            <Zap className="w-2 h-2 text-blue-500" />
                            <span className="text-[7px] font-bold text-blue-600 uppercase">下一步</span>
                          </div>
                        )}
                        {pt.lastCompletedAt && (
                          <div className="absolute bottom-1 right-2 text-[7px] text-emerald-700/40 font-bold">
                            上次：{pt.lastCompletedAt.split(" ")[0].slice(5)}
                          </div>
                        )}
                      </PressableItem>
                    ))}
                    {isSelected && hourTasks.length === 0 && (
                      <div className="flex-1 flex items-center justify-center min-h-[30px]">
                        <Plus className="w-4 h-4 text-emerald-300 animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Actual column */}
                  <div className="flex-1 border-l border-dashed border-gray-200 p-1 flex flex-col gap-1">
                    {actualTasks
                      .filter((at) => at.hour === hour)
                      .map((at, idx) => (
                        <div
                          key={at.id || idx}
                          className="w-full bg-[#b5838d]/10 backdrop-blur-md border border-[#b5838d]/20 rounded-lg p-2 flex items-center shadow-sm"
                        >
                          <span className="text-[11px] font-bold text-[#6d4c51] truncate leading-tight">
                            {at.text}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* Bottom Area: Categories Grid + Inbox Input */}
      <div className="fixed bottom-20 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pointer-events-auto">
          {/* Categories Grid (Horizontal Scroll) */}
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-4 px-4">
            <section className="acrylic bg-blue-500/15 backdrop-blur-md rounded-xl p-3 flex flex-col gap-2 aspect-square border-blue-500/20 shadow-sm overflow-hidden w-[38vw] shrink-0 sm:w-[240px] snap-center">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-blue-900 text-[11px]">
                  临时待办
                </h3>
                <button onClick={() => setAddingTemp(true)}>
                  <PlusCircle className="w-3.5 h-3.5 text-blue-900/60 hover:text-blue-900 transition-colors" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-1">
                {tempTasks
                  .slice()
                  .sort((a, b) => Number(a.completed) - Number(b.completed))
                  .map((t) => (
                    <PressableItem
                      key={t.id}
                      onLongPress={() => openTaskActionSheet(t, "temp")}
                      className={`flex items-start gap-2 cursor-pointer group relative ${t.completed ? "opacity-50" : ""}`}
                      onClick={() => handleTaskClickForPlan(t.text)}
                    >
                      <button
                        className="pt-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTask(t.text, false);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {t.completed ? (
                          <CheckCircle2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-blue-900/30 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                        )}
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-[11.5px] font-medium text-blue-900 leading-[1.3] ${t.completed ? "line-through text-blue-900/40" : ""}`}
                        >
                          {t.text}
                        </span>
                      </div>
                      {t.taskType === "waiting" && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-sm z-10">
                          <Clock className="w-2 h-2 text-amber-500" />
                          <span className="text-[7px] font-bold text-amber-600 uppercase">等待</span>
                        </div>
                      )}
                      {t.taskType === "next" && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 shadow-sm z-10">
                          <Zap className="w-2 h-2 text-blue-500" />
                          <span className="text-[7px] font-bold text-blue-600 uppercase">下一步</span>
                        </div>
                      )}
                      {t.lastCompletedAt && (
                        <div className="absolute bottom-0 right-1 text-[7px] text-blue-700/40 font-bold">
                          上次：{t.lastCompletedAt.split(" ")[0].slice(5)}
                        </div>
                      )}
                    </PressableItem>
                  ))}
                {addingTemp && (
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-blue-900/30 flex-shrink-0" />
                    <input
                      autoFocus
                      className="bg-transparent border-b border-blue-700/30 focus:border-blue-700 outline-none text-[10px] font-medium text-blue-900 w-full pb-0.5"
                      value={newTemp}
                      onChange={(e) => setNewTemp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTemp.trim()) {
                          setTempTasks([
                            ...tempTasks,
                            {
                              id: `tt-${Date.now()}`,
                              text: newTemp.trim(),
                              completed: false,
                            },
                          ]);
                          setNewTemp("");
                          setAddingTemp(false);
                        } else if (e.key === "Escape") {
                          setAddingTemp(false);
                          setNewTemp("");
                        }
                      }}
                      onBlur={() => {
                        if (newTemp.trim()) {
                          setTempTasks([
                            ...tempTasks,
                            {
                              id: `tt-${Date.now()}`,
                              text: newTemp.trim(),
                              completed: false,
                            },
                          ]);
                        }
                        setNewTemp("");
                        setAddingTemp(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </section>

            <section
              onClick={() => {
                setActiveTab("week");
                setWeekTab("下一步");
              }}
              className="acrylic bg-red-500/15 backdrop-blur-md rounded-xl p-3 flex flex-col gap-2 aspect-square border-red-500/20 shadow-sm overflow-hidden w-[38vw] shrink-0 sm:w-[240px] snap-center cursor-pointer group/sched"
            >
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-red-900 text-[11px]">
                  安排任务
                </h3>
                <ChevronRight className="w-3.5 h-3.5 text-red-900/60 group-hover/sched:translate-x-0.5 transition-all" />
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-1">
                {[...scheduledTasks, ...(weekTasksByDay[1] || [])]
                  .sort((a, b) => Number(a.completed) - Number(b.completed))
                  .map((t, idx) => (
                    <PressableItem
                      key={t.id}
                      onLongPress={() => openTaskActionSheet(t, "scheduled")}
                      className={`flex items-start gap-2 cursor-pointer group relative ${t.completed ? "opacity-50" : ""}`}
                      onClick={() => handleTaskClickForPlan(t.text)}
                    >
                      <button
                        className="pt-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteTask(t.text, false);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        {t.completed ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-3 h-3 text-red-900/30 group-hover:text-green-500 transition-colors flex-shrink-0" />
                        )}
                      </button>
                      <div className="flex flex-col min-w-0">
                        <span
                          className={`text-[11.5px] font-medium text-red-900 leading-[1.3] ${t.completed ? "line-through text-gray-400" : ""}`}
                        >
                          {t.text}
                        </span>
                      </div>
                      {t.taskType === "waiting" && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-sm z-10">
                          <Clock className="w-2 h-2 text-amber-500" />
                          <span className="text-[7px] font-bold text-amber-600 uppercase">等待</span>
                        </div>
                      )}
                      {t.taskType === "next" && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 shadow-sm z-10">
                          <Zap className="w-2 h-2 text-blue-500" />
                          <span className="text-[7px] font-bold text-blue-600 uppercase">下一步</span>
                        </div>
                      )}
                      {t.lastCompletedAt && (
                        <div className="absolute bottom-0 right-1 text-[7px] text-red-700/40 font-bold">
                          上次：{t.lastCompletedAt.split(" ")[0].slice(5)}
                        </div>
                      )}
                    </PressableItem>
                  ))}
                {addingScheduled && (
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-blue-900/30 flex-shrink-0" />
                    <input
                      autoFocus
                      className="bg-transparent border-b border-blue-700/30 focus:border-blue-900 outline-none text-[10px] font-medium text-blue-900 w-full pb-0.5"
                      value={newScheduled}
                      onChange={(e) => setNewScheduled(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newScheduled.trim()) {
                          setScheduledTasks([
                            ...scheduledTasks,
                            {
                              id: `st-${Date.now()}`,
                              text: newScheduled.trim(),
                              completed: false,
                            },
                          ]);
                          setNewScheduled("");
                          setAddingScheduled(false);
                        } else if (e.key === "Escape") {
                          setAddingScheduled(false);
                          setNewScheduled("");
                        }
                      }}
                      onBlur={() => {
                        if (newScheduled.trim()) {
                          setScheduledTasks([
                            ...scheduledTasks,
                            {
                              id: `st-${Date.now()}`,
                              text: newScheduled.trim(),
                              completed: false,
                            },
                          ]);
                        }
                        setNewScheduled("");
                        setAddingScheduled(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </section>


            <section className="acrylic bg-rose-500/15 backdrop-blur-md rounded-xl p-3 flex flex-col gap-2 aspect-square border-rose-500/20 shadow-sm overflow-hidden w-[38vw] shrink-0 sm:w-[240px] snap-center">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-rose-900 text-[11px]">习惯</h3>
                <button
                  onClick={() => setShowAllHabits(!showAllHabits)}
                  className="text-[9px] font-black uppercase text-rose-700 px-1.5 py-0.5 bg-white/40 hover:bg-white/60 transition-colors rounded-lg"
                >
                  {showAllHabits ? "收起" : "全部"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pb-1">
                {(showAllHabits ? habits : habits.slice(0, 5)).map((t, idx) => (
                  <PressableItem
                    key={t.id}
                    onLongPress={() => openTaskActionSheet(t, "habit")}
                    className="flex items-center gap-2 p-1.5 bg-white/30 rounded-lg border border-white/40 cursor-pointer group"
                    onClick={() => handleTaskClickForPlan(t.text)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteTask(t.text, false);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <Circle className="w-3 h-3 text-rose-700/60 group-hover:text-green-500 transition-colors" />
                    </button>
                    <span className="text-[10px] font-medium text-rose-900 truncate">
                      {t.text}
                    </span>
                  </PressableItem>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const importantTasksStr = useMemo(() => {
    const tasks = [];
    [
      ...scheduledTasks,
      ...tempTasks,
      ...plannedTasks,
      ...monthTasks,
      ...yearTasks,
      ...somedayTasks,
    ].forEach((t) => {
      if (t.important && !tasks.includes(t.text)) tasks.push(t.text);
    });
    [...monthGoals, ...yearGoals, ...somedayGoals].forEach((g) => {
      g.keyResults?.forEach((kr) => {
        kr.tasks.forEach((t) => {
          if (t.important && !tasks.includes(t.text)) tasks.push(t.text);
        });
      });
    });
    return tasks;
  }, [
    scheduledTasks,
    tempTasks,
    plannedTasks,
    monthTasks,
    yearTasks,
    somedayTasks,
    monthGoals,
    yearGoals,
    somedayGoals,
  ]);

  const allWeekNextTasks = useMemo(() => {
    const combined = [...weekNextTasks];
    importantTasksStr.forEach((tText) => {
      // If the important task text is not already in combined, add it as a new "important" TodoItem
      if (!combined.some((t) => t.text === tText)) {
        combined.push({
          id: `imp-${tText}`,
          text: tText,
          completed: false,
          important: true,
        });
      }
    });
    return combined;
  }, [weekNextTasks, importantTasksStr]);

  const renderWeek = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <header className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
            本周
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {(weekOffset !== 0 ||
            weekSelectedDay !==
              (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1)) && (
            <button
              onClick={() => {
                setWeekOffset(0);
                const day = new Date().getDay();
                setWeekSelectedDay(day === 0 ? 6 : day - 1);
              }}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-100"
            >
              回到今天
            </button>
          )}
          <div className="flex items-center gap-0.5 text-gray-500 bg-gray-50 p-0.5 rounded-lg border border-gray-100">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-3 text-center whitespace-nowrap min-w-[80px]">
              第{18 + weekOffset}周
            </span>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Date Selector */}
      <div className="border-b border-gray-100 pb-3">
        {(() => {
          const getDayTasks = (dIdx: number, offset: number) => {
            // 获取当前周的周一作为基准
            const now = new Date();
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            const bDate = new Date(now.setDate(diff));
            bDate.setHours(0, 0, 0, 0);
            
            const tDate = new Date(bDate);
            tDate.setDate(bDate.getDate() + dIdx + offset * 7);
            const y = tDate.getFullYear();
            const m = String(tDate.getMonth() + 1).padStart(2, "0");
            const dStr = String(tDate.getDate()).padStart(2, "0");
            const tDateStr = `${y}-${m}-${dStr}`;

            const allPossibleTasks = [
              ...Object.values(weekTasksByDay).flat(),
              ...weekNextTasks,
              ...weekWaitTasks,
              ...weekRepeatTasks,
              ...tempTasks,
              ...inboxTasks,
            ].filter(
              (t, i, self) => self.findIndex((st) => st.id === t.id) === i,
            );

            // 1. Range Tasks
            const rangeTasks = allPossibleTasks.filter((t) => {
              if (t.startDate && t.dueDate) {
                return tDateStr >= t.startDate && tDateStr <= t.dueDate;
              }
              return false;
            });

            // 2. Repeating Tasks (Daily) - only if not already in rangeTasks
            const repeatingDaily = weekRepeatTasks.filter((t) => {
              if (rangeTasks.some(rt => rt.id === t.id)) return false;
              if (t.repeatUnit !== "day" || !t.isScheduled) return false;
              if (t.startDate && tDateStr < t.startDate) return false;
              if (t.dueDate && tDateStr > t.dueDate) return false;
              const freq = t.repeatFrequency || 1;
              const totalDaysOffset = dIdx + offset * 7;
              return totalDaysOffset % freq === 0;
            });

            // 3. Specific/Normal tasks - only if not already in range or repeating
            const specificTasks = (weekTasksByDay[dIdx] || []).filter(
              (t) => {
                if (t.startDate && t.dueDate) return false;
                if (t.repeatUnit === "day" && t.isScheduled) return false;
                return !rangeTasks.some((rt) => rt.id === t.id) && !repeatingDaily.some(rt => rt.id === t.id);
              }
            );

            return [...rangeTasks, ...repeatingDaily, ...specificTasks];
          };

          // Stable identities search across the full week - Calculated once per week
          const weekIdentities = (() => {
            const ids = new Map<string, TodoItem>();
            for (let d = 0; d < 7; d++) {
              getDayTasks(d, weekOffset).forEach((t) => {
                if (!ids.has(t.id)) ids.set(t.id, t);
              });
            }
            return Array.from(ids.values()).sort((a, b) =>
              a.text.localeCompare(b.text) || a.id.localeCompare(b.id),
            );
          })();

          return (
            <div className="flex items-start overflow-x-auto snap-x snap-mandatory gap-0 -mx-4 px-4 no-scrollbar">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                const baseDate = new Date(now.setDate(diff));
                baseDate.setHours(0, 0, 0, 0);

                const targetDate = new Date(baseDate);
                targetDate.setDate(
                  baseDate.getDate() + dayIndex + weekOffset * 7,
                );
                const dayNames = ["一", "二", "三", "四", "五", "六", "日"];
                const today = new Date();
                const isToday =
                  targetDate.toDateString() === today.toDateString();
                const isSelected = weekSelectedDay === dayIndex;

                const dayTasks = weekIdentities.map((identity) => {
                  const tasks = getDayTasks(dayIndex, weekOffset);
                  return tasks.find((t) => t.id === identity.id) || null;
                });

                return (
                  <div
                    key={dayIndex}
                    style={{ zIndex: 70 - dayIndex * 10 }}
                    className={`flex-none w-[96px] snap-center flex flex-col items-center px-2 py-1 transition-all border-r border-gray-100 last:border-r-0 relative hover:z-[80] ${
                      isSelected
                        ? "bg-emerald-50/40"
                        : isToday
                          ? "bg-emerald-50/10"
                          : ""
                    }`}
                    onClick={() =>
                      setWeekSelectedDay(isSelected ? null : dayIndex)
                    }
                  >
                    <div className="flex flex-col items-center mb-2 pt-1">
                      <span
                        className={`text-[9px] font-bold mb-1 ${isSelected ? "text-emerald-600" : isToday ? "text-emerald-600" : "text-gray-400 font-medium"}`}
                      >
                        {dayNames[dayIndex]}
                      </span>
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300 ${
                          isSelected
                            ? "text-white bg-emerald-600 font-bold"
                            : isToday
                              ? "text-emerald-600 font-black border-2 border-emerald-600 bg-white"
                              : "text-gray-900 border border-gray-100 font-bold"
                        }`}
                      >
                        {targetDate.getDate()}
                      </div>
                    </div>

                    <div className="w-full flex flex-col gap-1.5 min-h-[100px]">
                      {dayTasks.map((task, idx) => {
                        if (!task)
                          return (
                            <div
                              key={`empty-${idx}`}
                              className="w-full h-[36px] opacity-0"
                            />
                          );

                        const isExpanded = expandedTasks.has(task.id);
                        const subtasks = task.subtasks || [];
                        const subtaskInfo =
                          subtasks.length > 0
                            ? ` (${subtasks.filter((s) => s.completed).length}/${subtasks.length})`
                            : "";

                        // Check for connection (same task in adjacent days at same visual row)
                        const hasNext =
                          [0, 1, 2, 3, 4, 5].includes(dayIndex) &&
                          (() => {
                            const nextTasks = weekIdentities.map((identity) => {
                              const tasks = getDayTasks(
                                dayIndex + 1,
                                weekOffset,
                              );
                              return (
                                tasks.find((t) => t.id === identity.id) || null
                              );
                            });
                            return nextTasks[idx]?.id === task.id;
                          })();

                        const hasPrev =
                          [1, 2, 3, 4, 5, 6].includes(dayIndex) &&
                          (() => {
                            const prevTasks = weekIdentities.map((identity) => {
                              const tasks = getDayTasks(
                                dayIndex - 1,
                                weekOffset,
                              );
                              return (
                                tasks.find((t) => t.id === identity.id) || null
                              );
                            });
                            return prevTasks[idx]?.id === task.id;
                          })();

                        const isFirstInSequence = !hasPrev && hasNext;
                        const inSequence = hasNext || hasPrev;

                        let spanCount = 1;
                        if (isFirstInSequence) {
                          let scanIdx = 1;
                          while (
                            [0, 1, 2, 3, 4, 5].includes(dayIndex + scanIdx - 1)
                          ) {
                            const d = dayIndex + scanIdx;
                            const dDayTasks = weekIdentities.map((identity) => {
                              const tasks = getDayTasks(d, weekOffset);
                              return (
                                tasks.find((t) => t.id === identity.id) || null
                              );
                            });
                            if (dDayTasks[idx]?.id === task.id) {
                              spanCount++;
                              scanIdx++;
                            } else {
                              break;
                            }
                          }
                        }

                        return (
                          <PressableItem
                            key={`${task.id}-${idx}`}
                            onLongPress={() => {
                              const isRepeat = weekRepeatTasks.some((rt) => rt.id === task.id);
                              const isNext = weekNextTasks.some((nt) => nt.id === task.id);
                              const isWait = weekWaitTasks.some((wt) => wt.id === task.id);
                              const isTemp = tempTasks.some((tt) => tt.id === task.id);
                              const isInbox = inboxTasks.some((it) => it.id === task.id);

                              let type = "week_day";
                              if (isRepeat) type = "week_repeat";
                              else if (isNext) type = "week_next";
                              else if (isWait) type = "week_wait";
                              else if (isTemp) type = "temp";
                              else if (isInbox) type = "inbox";

                              openTaskActionSheet(task, type as any, type === "week_day" ? dayIndex : undefined);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (subtasks.length > 0) {
                                toggleTaskExpansion(task.id);
                              }
                            }}
                            className={`p-1.5 rounded flex flex-col items-start relative group transition-all w-full min-h-[36px] hover:z-50
                              ${inSequence ? "" : `bg-white border shadow-sm hover:border-emerald-200 ${isExpanded ? "border-emerald-200 ring-2 ring-emerald-50" : "border-gray-50"}`}
                            `}
                          >
                        {isFirstInSequence && (
                          <div
                            style={{
                              width: `${spanCount * 96 - 16}px`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (subtasks.length > 0) {
                                toggleTaskExpansion(task.id);
                              }
                            }}
                            className={`absolute left-0 top-0 h-[36px] bg-emerald-100/90 border border-emerald-300 rounded cursor-pointer overflow-hidden flex flex-col justify-center z-20 pointer-events-auto shadow-sm px-2 transition-all hover:bg-emerald-200/90 ${isExpanded ? "ring-2 ring-emerald-400" : ""}`}
                          >
                            <div className="flex items-center gap-1 w-full">
                              {subtasks.length > 0 && (
                                <ChevronRight
                                  className={`w-3 h-3 text-emerald-700 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                />
                              )}
                              <span className="text-[10px] font-bold text-emerald-900 truncate flex-1">
                                {task.text}
                                {subtaskInfo}
                              </span>
                            </div>
                          </div>
                        )}

                        <div
                          className={`flex items-center gap-1 w-full ${inSequence ? "opacity-0" : ""}`}
                        >
                          {subtasks.length > 0 && (
                            <ChevronRight
                              className={`w-2.5 h-2.5 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                          )}
                          <span className="text-[9px] font-bold text-gray-700 leading-tight whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                            {task.text}
                            {subtaskInfo}
                          </span>
                        </div>
                        {!inSequence && task.lastCompletedAt && (
                          <div className="text-[8px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                            <CheckCircle2 className="w-2 h-2 text-gray-300" />
                            上次：{task.lastCompletedAt.split(" ")[0].slice(5)}
                          </div>
                        )}

                        {/* Subtasks display */}
                        <AnimatePresence>
                          {isExpanded && subtasks.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="w-full mt-2 space-y-1 overflow-hidden"
                            >
                              {subtasks.map((st) => (
                                <div
                                  key={st.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSubtask(task.id, st.id);
                                  }}
                                  className="flex items-center gap-1.5 px-1 py-0.5"
                                >
                                  {st.completed ? (
                                    <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-[2px] border border-gray-300" />
                                  )}
                                  <span
                                    className={`text-[9px] font-medium transition-all ${st.completed ? "text-gray-400 line-through" : "text-gray-600"}`}
                                  >
                                    {st.text}
                                  </span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <button
                          className="absolute -top-2 -left-2 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 shadow-md opacity-0 group-hover:opacity-100 transition-all z-30"
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            if (task.repeatUnit === "day") {
                              setWeekRepeatTasks(
                                weekRepeatTasks.map((rt) =>
                                  rt.id === task.id
                                    ? { ...rt, isScheduled: false }
                                    : rt,
                                ),
                              );
                              return;
                            }

                            const isRange = task.startDate && task.dueDate;
                            if (isRange) {
                              const clearRangeParams = (t: TodoItem) =>
                                t.id === task.id
                                  ? { ...t, startDate: undefined, dueDate: undefined }
                                  : t;
                              setWeekNextTasks((prev) => prev.map(clearRangeParams));
                              setWeekWaitTasks((prev) => {
                                const mapped = prev.map(clearRangeParams);
                                if (!mapped.some(t => t.id === task.id) && 
                                    !weekNextTasks.some(t => t.id === task.id) &&
                                    !tempTasks.some(t => t.id === task.id) &&
                                    !inboxTasks.some(t => t.id === task.id) &&
                                    !weekRepeatTasks.some(t => t.id === task.id)) {
                                  mapped.push({ ...task, startDate: undefined, dueDate: undefined });
                                }
                                return mapped;
                              });
                              setTempTasks((prev) => prev.map(clearRangeParams));
                              setInboxTasks((prev) => prev.map(clearRangeParams));
                              setWeekRepeatTasks((prev) => prev.map(clearRangeParams));
                              setWeekTasksByDay((prev) => {
                                const next = { ...prev };
                                Object.keys(next).forEach((day) => {
                                  next[day as any] = next[day as any].filter((t: TodoItem) => t.id !== task.id);
                                });
                                return next;
                              });
                            } else {
                              const newTasks = (
                                weekTasksByDay[dayIndex] || []
                              ).filter((t) => t.id !== task.id);
                              setWeekTasksByDay({
                                ...weekTasksByDay,
                                [dayIndex]: newTasks,
                              });
                              setWeekWaitTasks((prev) => {
                                if (prev.some((t) => t.id === task.id)) return prev;
                                return [...prev, { ...task, startDate: undefined, dueDate: undefined }];
                              });
                            }
                          }}
                        >
                          <Undo2 className="w-3 h-3" />
                        </button>
                      </PressableItem>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    })()}
  </div>

      <div className="space-y-2 pb-12">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar items-center pb-1">
          {[
            { tag: "全部", label: "全部" },
            { tag: "下一步", label: "下一步" },
            { tag: "等待", label: "等待" },
            { tag: "重复事项", label: "重复" },
            { tag: "临时待办", label: "临时" },
          ].map((item) => (
            <button
              key={item.tag}
              onClick={() => setWeekTab(item.tag)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shadow-sm border ${
                weekTab === item.tag
                  ? "bg-emerald-500 text-white border-emerald-500 animate-in fade-in zoom-in-95 shadow-emerald-500/20"
                  : "bg-white text-gray-500 border-gray-100 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-2 min-h-[200px]">
          {(() => {
            const rawList =
              weekTab === "全部"
                ? [
                    ...allWeekNextTasks,
                    ...weekWaitTasks,
                    ...weekRepeatTasks,
                    ...tempTasks,
                  ]
                : weekTab === "下一步"
                  ? allWeekNextTasks
                  : weekTab === "等待"
                    ? weekWaitTasks
                    : weekTab === "重复事项"
                      ? weekRepeatTasks
                      : tempTasks;

            const displayList = rawList;

            if (displayList.length === 0) {
              return (
                <div className="text-center py-10 bg-white/50 rounded-xl border border-dashed border-gray-200">
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <ListTodo className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-[10px] font-medium text-gray-400">
                    没有找到相应的任务
                  </p>
                </div>
              );
            }

            return displayList.map((t, i) => {
              const isNext = allWeekNextTasks.includes(t);
              const isWait = weekWaitTasks.includes(t);
              const isTemp = tempTasks.includes(t);
              const type = isWait
                ? "week_wait"
                : isNext
                  ? "week_next"
                  : isTemp
                    ? "temp"
                    : "week_repeat";

              const isExpanded = expandedTasks.has(t.id);
              const subtasks = t.subtasks || [];
              const subtaskInfo =
                subtasks.length > 0
                  ? ` (${subtasks.filter((s) => s.completed).length}/${subtasks.length})`
                  : "";

              return (
                <div key={`${t.id}-${i}`} className="flex flex-col w-full">
                  <PressableItem
                    onLongPress={() => {
                      openTaskActionSheet(t, type);
                    }}
                    onClick={() => {
                      if (weekSelectedDay !== null) {
                        if (t.repeatUnit === "day") {
                          setWeekRepeatTasks(
                            weekRepeatTasks.map((task) =>
                              task.id === t.id
                                ? { ...task, isScheduled: true }
                                : task,
                            ),
                          );
                        } else {
                          const newDayTasks = [
                            ...(weekTasksByDay[weekSelectedDay] || []),
                            t,
                          ];
                          setWeekTasksByDay({
                            ...weekTasksByDay,
                            [weekSelectedDay]: newDayTasks,
                          });

                          if (isWait)
                            setWeekWaitTasks(
                              weekWaitTasks.filter((task) => task.id !== t.id),
                            );
                          else if (isNext)
                            setWeekNextTasks(
                              weekNextTasks.filter((task) => task.id !== t.id),
                            );
                          else if (isTemp)
                            setTempTasks(
                              tempTasks.filter((task) => task.id !== t.id),
                            );
                          else
                            setWeekRepeatTasks(
                              weekRepeatTasks.filter((task) => task.id !== t.id),
                            );
                        }
                      } else if (subtasks.length > 0) {
                        toggleTaskExpansion(t.id);
                      }
                    }}
                    className={`flex items-center gap-2.5 p-2.5 bg-white rounded-lg border shadow-sm group transition-all relative ${
                      weekSelectedDay !== null
                        ? "cursor-pointer hover:border-emerald-300 hover:translate-x-1"
                        : ""
                    } ${isExpanded ? "border-emerald-200 ring-2 ring-emerald-50" : "border-gray-50"}`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-md border-2 flex-shrink-0 transition-colors ${
                        isWait
                          ? "border-orange-200 group-hover:border-orange-400"
                          : isNext
                            ? "border-emerald-200 group-hover:border-emerald-400"
                            : isTemp
                              ? "border-purple-200 group-hover:border-purple-400"
                              : "border-green-200 group-hover:border-green-400"
                      }`}
                    ></div>
                    <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-800 truncate">
                          {t.text}
                          {subtaskInfo}
                        </span>
                        {subtasks.length > 0 && (
                          <ChevronRight
                            className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(t.startDate || t.dueDate) && (
                          <div className="flex items-center gap-2">
                            {t.startDate && (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                                <CalendarDays className="w-2.5 h-2.5" />
                                {t.startDate} 开始
                              </div>
                            )}
                            {t.dueDate && (
                              <div className="flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-1 rounded">
                                <Calendar className="w-2.5 h-2.5" />
                                {t.dueDate} 截止
                              </div>
                            )}
                          </div>
                        )}
                        {!isWait && !isNext && !isTemp && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">
                            <RefreshCw className="w-2.5 h-2.5" />
                            {t.repeatUnit === "day"
                              ? `每${t.repeatFrequency || 1}天1次`
                              : `每${t.repeatFrequency || 1}周1次`}
                          </div>
                        )}
                        {t.lastCompletedAt && (
                          <div className="absolute bottom-2 right-2.5 text-[8px] text-gray-400 font-bold">
                            上次：{t.lastCompletedAt.split(" ")[0].slice(5)}
                          </div>
                        )}
                      </div>
                      <span className="absolute top-2 right-2 text-[8px] font-black uppercase text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 flex items-center gap-1 shadow-sm">
                        {isWait ? (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            等待待定
                          </>
                        ) : isNext ? (
                          <>
                            <ArrowRight className="w-2.5 h-2.5" />
                            下一步
                          </>
                        ) : isTemp ? (
                          <>
                            <Zap className="w-2.5 h-2.5" />
                            临时待办
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-2.5 h-2.5" />
                            重复事项
                          </>
                        )}
                      </span>
                    </div>
                    {weekSelectedDay !== null && (
                      <ArrowRight className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </PressableItem>

                  {/* Subtasks display */}
                  <AnimatePresence>
                    {isExpanded && subtasks.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="w-full bg-white/50 border-x border-b border-gray-100 rounded-b-xl -mt-2 pt-4 pb-2 px-10 space-y-1.5 overflow-hidden"
                      >
                        {subtasks.map((st) => (
                          <div
                            key={st.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSubtask(t.id, st.id);
                            }}
                            className="flex items-center gap-3 py-0.5 group/sub cursor-pointer"
                          >
                            <button className="flex-shrink-0">
                              {st.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded border-2 border-gray-200 group-hover/sub:border-emerald-300 transition-colors" />
                              )}
                            </button>
                            <span
                              className={`text-xs font-medium transition-all ${st.completed ? "text-gray-400 line-through" : "text-gray-600"}`}
                            >
                              {st.text}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            });
          })()}
        </div>

        {/* Review Card from reference */}
        <div className="bg-[#fcf6f1] border border-[#f0e2d5] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-[#a66232]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a8 8 0 0 0-8 8c0 5 3 7 3 11h10c0-4 3-6 3-11a8 8 0 0 0-8-8z" />
              <path d="M9 22h6" />
              <path d="M9 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
            </svg>
            <h3 className="font-bold text-base">
              上次复盘于 {daysSinceLastReview} 天前
            </h3>
          </div>
          <p className="text-[11px] text-[#a66232]/80 font-medium leading-tight">
            回顾本周成就，反思待改进之处，为下周做好规划。
          </p>
          <button
            onClick={() => setIsReviewOpen(true)}
            className="mt-1 w-full py-2.5 bg-[#9b5110] text-[#fcf6f1] rounded-lg text-xs font-bold hover:bg-[#80420c] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>开始复盘</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderGoals = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4"
    >
      <header className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            目标规划
          </h2>
          <p className="text-gray-400 text-[10px] mt-0.5">
            查看和管理你的每周、月度与年度目标
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedTasks([]);
              } else {
                setIsSelectionMode(true);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${isSelectionMode ? "bg-emerald-100 text-emerald-700" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {isSelectionMode ? "取消多选" : "多选"}
          </button>
        </div>
      </header>

      {renderCategoryBar(goalsTab, setGoalsTab)}

      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 -mx-4 px-4 pb-8 no-scrollbar mt-2 items-start">
        {/* Week Goals Column */}
        <div className="flex-shrink-0 w-[55vw] md:w-[320px] snap-start space-y-4">
          <div className="flex items-center justify-between px-0 md:px-1">
            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-1.5 md:gap-2">
              <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
              周目标
            </h3>
            <button
              onClick={() => {
                setGoalType("week");
                setIsGoalModalOpen(true);
              }}
              className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">新增</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {weekGoals
              .filter((p) => goalsTab === "全部" || p.category === goalsTab)
              .map((p) => (
                <div
                  key={p.id}
                  className="fluent-card group cursor-pointer border border-gray-100 hover:ring-2 ring-emerald-500/20 hover:border-emerald-200 transition-all rounded-xl flex flex-col overflow-hidden bg-white shadow-sm"
                >
                  <PressableItem
                    className="p-2 md:p-3 pb-2 flex-1 flex flex-col"
                    onClick={() => toggleGoalExpand(p.id)}
                    onLongPress={() => {
                      setActionSheetConfig({
                        id: p.id,
                        title: p.name,
                        type: "goal",
                        onEdit: () => {
                          setGoalType("week");
                          setEditingGoal(p);
                          setIsGoalModalOpen(true);
                        },
                        onDelete: () => {
                          if (window.confirm(`确定要彻底删除目标 "${p.name}" 吗？`)) {
                            handleDeleteGoal(p.id, "week");
                          }
                        }
                      });
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1 mr-1 md:mr-2">
                        <h4 className="font-bold text-gray-800 text-xs md:text-sm truncate">
                          {p.name}
                        </h4>
                        <span className="text-[8px] md:text-[9px] text-gray-400">
                          {p.startDate ? `${p.startDate} 至 ` : "截止: "}{p.date}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-${p.color}-50 text-${p.color}-600 border border-${p.color}-100 flex items-center gap-1`}
                      >
                        {p.progress === 100
                          ? "已完成"
                          : p.progress >= 80
                            ? "即将完成"
                            : "进行中"}
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expandedGoalIds.has(p.id) ? "rotate-180" : ""}`} />
                      </span>
                    </div>
                    <div className="space-y-1 mb-1 mt-auto leading-none">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-400">进度</span>
                        <span
                          className={
                            p.progress > 50
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }
                        >
                          {p.progress}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full bg-${p.color}-600 rounded-full`}
                        />
                      </div>
                    </div>
                  </PressableItem>

                  {/* Key Results */}
                  {p.keyResults &&
                    (expandedGoalIds.has(p.id) || p.keyResults.some((kr) =>
                      kr.tasks.some((t) => t.important),
                    )) && (
                      <div className="bg-gray-50 border-t border-gray-100 px-2 md:px-3 py-1.5 md:py-2.5 space-y-2 mt-auto shadow-inner">
                        <AnimatePresence>
                          {p.keyResults
                            .filter((kr) => expandedGoalIds.has(p.id) || kr.tasks.some((t) => t.important))
                            .map((kr, krIdx) => (
                              <motion.div
                                key={kr.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden"
                              >
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-1 h-1 rounded-full bg-${p.color}-400`}
                                  ></div>
                                  <h5 className="text-[10px] font-bold text-gray-700 truncate mr-1">
                                    KR: {kr.name}
                                  </h5>
                                </div>
                                <div className="space-y-1">
                                  {kr.tasks
                                    .filter((task) => expandedGoalIds.has(p.id) || task.important)
                                    .map((task) => (
                                      <div
                                        key={task.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleKRTask(
                                            "week",
                                            p.id,
                                            kr.id,
                                            task.id,
                                          );
                                        }}
                                        className={`flex items-center gap-2 group/task cursor-pointer py-1.5 px-2 rounded-lg transition-colors border relative ${task.completed ? "bg-white/60 border-transparent" : "bg-white border-gray-200 hover:border-emerald-300 hover:ring-1 ring-emerald-500/10"}`}
                                      >
                                        <button className="flex-shrink-0 mt-0.5">
                                          {task.completed ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                          ) : (
                                            <div className="w-3.5 h-3.5 rounded border border-gray-300 group-hover/task:border-emerald-400 transition-colors bg-white"></div>
                                          )}
                                        </button>
                                        <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                          <span
                                            className={`text-[10px] md:text-[11px] font-bold truncate transition-colors ${task.completed ? "text-gray-400 line-through font-medium" : "text-gray-700"}`}
                                          >
                                            {task.text}
                                          </span>
                                        </div>
                                        {task.taskType === "waiting" && (
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-sm z-10">
                                            <Clock className="w-2 h-2 text-amber-500" />
                                            <span className="text-[7px] font-bold text-amber-600 uppercase">等待</span>
                                          </div>
                                        )}
                                        {task.taskType === "next" && (
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 shadow-sm z-10">
                                            <Zap className="w-2 h-2 text-blue-500" />
                                            <span className="text-[7px] font-bold text-blue-600 uppercase">下一步</span>
                                          </div>
                                        )}
                                        {task.lastCompletedAt && (
                                          <div className="absolute bottom-1 right-2 text-[7px] text-gray-400 font-bold">
                                            上次：
                                            {
                                              task.lastCompletedAt
                                                .split(" ")[0]
                                                .slice(5)
                                            }
                                          </div>
                                        )}
                                        {task.important && (
                                          <Star
                                            className={`w-3 h-3 ml-auto flex-shrink-0 ${task.completed ? "text-gray-300" : "text-yellow-500"}`}
                                            fill="currentColor"
                                          />
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    )}
                </div>
              ))}
          </div>
        </div>

        {/* Month Goals Column */}
        <div className="flex-shrink-0 w-[55vw] md:w-[320px] snap-start space-y-4">
          <div className="flex items-center justify-between px-0 md:px-1">
            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-1.5 md:gap-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
              月目标
            </h3>
            <button
              onClick={() => {
                setGoalType("month");
                setIsGoalModalOpen(true);
              }}
              className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">新增</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {monthGoals
              .filter((p) => goalsTab === "全部" || p.category === goalsTab)
              .map((p) => (
                <div
                  key={p.id}
                  className="fluent-card group cursor-pointer border border-gray-100 hover:ring-2 ring-emerald-500/20 hover:border-emerald-200 transition-all rounded-xl flex flex-col overflow-hidden bg-white shadow-sm"
                >
                  <PressableItem
                    className="p-2 md:p-3 pb-2 flex-1 flex flex-col"
                    onClick={() => toggleGoalExpand(p.id)}
                    onLongPress={() => {
                      setActionSheetConfig({
                        id: p.id,
                        title: p.name,
                        type: "goal",
                        onEdit: () => {
                          setGoalType("month");
                          setEditingGoal(p);
                          setIsGoalModalOpen(true);
                        },
                        onDelete: () => {
                          if (window.confirm(`确定要彻底删除目标 "${p.name}" 吗？`)) {
                            handleDeleteGoal(p.id, "month");
                          }
                        }
                      });
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1 mr-1 md:mr-2">
                        <h4 className="font-bold text-gray-800 text-xs md:text-sm truncate">
                          {p.name}
                        </h4>
                        <span className="text-[8px] md:text-[9px] text-gray-400">
                          {p.startDate ? `${p.startDate} 至 ` : "截止: "}{p.date}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-${p.color}-50 text-${p.color}-600 border border-${p.color}-100 flex items-center gap-1`}
                      >
                        {p.progress === 100
                          ? "已完成"
                          : p.progress >= 80
                            ? "即将完成"
                            : "进行中"}
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expandedGoalIds.has(p.id) ? "rotate-180" : ""}`} />
                      </span>
                    </div>
                    <div className="space-y-1 mb-1 mt-auto leading-none">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-400">进度</span>
                        <span
                          className={
                            p.progress > 50
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }
                        >
                          {p.progress}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full bg-${p.color}-600 rounded-full`}
                        />
                      </div>
                    </div>
                  </PressableItem>

                  {/* Key Results */}
                  {p.keyResults &&
                    (expandedGoalIds.has(p.id) || p.keyResults.some((kr) =>
                      kr.tasks.some((t) => t.important),
                    )) && (
                      <div className="bg-gray-50 border-t border-gray-100 px-2 md:px-3 py-1.5 md:py-2.5 space-y-2 mt-auto shadow-inner">
                        <AnimatePresence>
                          {p.keyResults
                            .filter((kr) => expandedGoalIds.has(p.id) || kr.tasks.some((t) => t.important))
                            .map((kr, krIdx) => (
                              <motion.div
                                key={kr.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden"
                              >
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-1 h-1 rounded-full bg-${p.color}-400`}
                                  ></div>
                                  <h5 className="text-[10px] font-bold text-gray-700 truncate mr-1">
                                    KR: {kr.name}
                                  </h5>
                                </div>
                                <div className="space-y-1">
                                  {kr.tasks
                                    .filter((task) => expandedGoalIds.has(p.id) || task.important)
                                    .map((task) => (
                                      <div
                                        key={task.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleKRTask(
                                            "month",
                                            p.id,
                                            kr.id,
                                            task.id,
                                          );
                                        }}
                                        className={`flex items-center gap-2 group/task cursor-pointer py-1.5 px-2 rounded-lg transition-colors border relative ${task.completed ? "bg-white/60 border-transparent" : "bg-white border-gray-200 hover:border-emerald-300 hover:ring-1 ring-emerald-500/10"}`}
                                      >
                                        <button className="flex-shrink-0 mt-0.5">
                                          {task.completed ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                          ) : (
                                            <div className="w-3.5 h-3.5 rounded border border-gray-300 group-hover/task:border-emerald-400 transition-colors bg-white"></div>
                                          )}
                                        </button>
                                        <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                          <span
                                            className={`text-[10px] md:text-[11px] font-bold truncate transition-colors ${task.completed ? "text-gray-400 line-through font-medium" : "text-gray-700"}`}
                                          >
                                            {task.text}
                                          </span>
                                        </div>
                                        {task.taskType === "waiting" && (
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-sm z-10">
                                            <Clock className="w-2 h-2 text-amber-500" />
                                            <span className="text-[7px] font-bold text-amber-600 uppercase">等待</span>
                                          </div>
                                        )}
                                        {task.taskType === "next" && (
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 shadow-sm z-10">
                                            <Zap className="w-2 h-2 text-blue-500" />
                                            <span className="text-[7px] font-bold text-blue-600 uppercase">下一步</span>
                                          </div>
                                        )}
                                        {task.lastCompletedAt && (
                                          <div className="absolute bottom-1 right-2 text-[7px] text-gray-400 font-bold">
                                            上次：
                                            {
                                              task.lastCompletedAt
                                                .split(" ")[0]
                                                .slice(5)
                                            }
                                          </div>
                                        )}
                                        {task.important && (
                                          <Star
                                            className={`w-3 h-3 ml-auto flex-shrink-0 ${task.completed ? "text-gray-300" : "text-yellow-500"}`}
                                            fill="currentColor"
                                          />
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    )}
                </div>
              ))}
          </div>

          {/* Month Inbox Tasks */}
          {monthTasks.filter(
            (t) => goalsTab === "全部" || t.category === goalsTab,
          ).length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3 px-1">
                <LayoutGrid className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-gray-800">月待整理</h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">
                  {
                    monthTasks.filter(
                      (t) => goalsTab === "全部" || t.category === goalsTab,
                    ).length
                  }
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {monthTasks
                  .filter((t) => goalsTab === "全部" || t.category === goalsTab)
                  .map((task) => renderTaskRow(task, "month", () => toggleItemCompletion("month", task.id)))}
              </div>
            </div>
          )}
        </div>

        {/* Year Goals Column */}
        <div className="flex-shrink-0 w-[55vw] md:w-[320px] snap-start space-y-4">
          <div className="flex items-center justify-between px-0 md:px-1">
            <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-1.5 md:gap-2">
              <CalendarRange className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
              年目标
            </h3>
            <button
              onClick={() => {
                setGoalType("year");
                setIsGoalModalOpen(true);
              }}
              className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">新增</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {yearGoals
              .filter((p) => goalsTab === "全部" || p.category === goalsTab)
              .map((p) => (
                <div
                  key={p.id}
                  className="fluent-card group cursor-pointer border border-gray-100 hover:ring-2 ring-emerald-500/20 hover:border-emerald-200 transition-all rounded-xl flex flex-col overflow-hidden bg-white shadow-sm"
                >
                  <PressableItem
                    className="p-2 md:p-3 pb-2 flex-1 flex flex-col"
                    onClick={() => toggleGoalExpand(p.id)}
                    onLongPress={() => {
                      setActionSheetConfig({
                        id: p.id,
                        title: p.name,
                        type: "goal",
                        onEdit: () => {
                          setGoalType("year");
                          setEditingGoal(p);
                          setIsGoalModalOpen(true);
                        },
                        onDelete: () => {
                          if (window.confirm(`确定要彻底删除目标 "${p.name}" 吗？`)) {
                            handleDeleteGoal(p.id, "year");
                          }
                        }
                      });
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1 mr-1 md:mr-2">
                        <h4 className="font-bold text-gray-800 text-xs md:text-sm truncate">
                          {p.name}
                        </h4>
                        <span className="text-[8px] md:text-[9px] text-gray-400">
                          {p.startDate ? `${p.startDate} 至 ` : "截止: "}{p.date}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-${p.color}-50 text-${p.color}-600 border border-${p.color}-100 flex items-center gap-1`}
                      >
                        {p.progress === 100 ? "已完成" : "进行中"}
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expandedGoalIds.has(p.id) ? "rotate-180" : ""}`} />
                      </span>
                    </div>
                    <div className="space-y-1 mb-1 mt-auto leading-none">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-gray-400">年度进度</span>
                        <span
                          className={
                            p.progress > 50
                              ? "text-emerald-600"
                              : "text-orange-600"
                          }
                        >
                          {p.progress}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full bg-${p.color}-600 rounded-full`}
                        />
                      </div>
                    </div>
                  </PressableItem>

                  {/* Key Results */}
                  {p.keyResults &&
                    (expandedGoalIds.has(p.id) || p.keyResults.some((kr) =>
                      kr.tasks.some((t) => t.important),
                    )) && (
                      <div className="bg-gray-50 border-t border-gray-100 px-2 md:px-3 py-1.5 md:py-2.5 space-y-2 mt-auto shadow-inner">
                        <AnimatePresence>
                          {p.keyResults
                            .filter((kr) => expandedGoalIds.has(p.id) || kr.tasks.some((t) => t.important))
                            .map((kr, krIdx) => (
                              <motion.div
                                key={kr.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-1.5 overflow-hidden"
                              >
                                <div className="flex items-center gap-1.5">
                                  <div
                                    className={`w-1 h-1 rounded-full bg-${p.color}-400`}
                                  ></div>
                                  <h5 className="text-[10px] font-bold text-gray-700 truncate mr-1">
                                    KR: {kr.name}
                                  </h5>
                                </div>
                                <div className="space-y-1">
                                  {kr.tasks
                                    .filter((task) => expandedGoalIds.has(p.id) || task.important)
                                    .map((task) => (
                                      <div
                                        key={task.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleKRTask(
                                            "year",
                                            p.id,
                                            kr.id,
                                            task.id,
                                          );
                                        }}
                                        className={`flex items-center gap-2 group/task cursor-pointer py-1.5 px-2 rounded-lg transition-colors border relative ${task.completed ? "bg-white/60 border-transparent" : "bg-white border-gray-200 hover:border-emerald-300 hover:ring-1 ring-emerald-500/10"}`}
                                      >
                                        <button className="flex-shrink-0 mt-0.5">
                                          {task.completed ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                          ) : (
                                            <div className="w-3.5 h-3.5 rounded border border-gray-300 group-hover/task:border-emerald-400 transition-colors bg-white"></div>
                                          )}
                                        </button>
                                        <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                          <span
                                            className={`text-[10px] md:text-[11px] font-bold truncate transition-colors ${task.completed ? "text-gray-400 line-through font-medium" : "text-gray-700"}`}
                                          >
                                            {task.text}
                                          </span>
                                        </div>
                                        {task.taskType === "waiting" && (
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-50 border border-amber-200 shadow-sm z-10">
                                            <Clock className="w-2 h-2 text-amber-500" />
                                            <span className="text-[7px] font-bold text-amber-600 uppercase">等待</span>
                                          </div>
                                        )}
                                        {task.taskType === "next" && (
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 shadow-sm z-10">
                                            <Zap className="w-2 h-2 text-blue-500" />
                                            <span className="text-[7px] font-bold text-blue-600 uppercase">下一步</span>
                                          </div>
                                        )}
                                        {task.lastCompletedAt && (
                                          <div className="absolute bottom-1 right-2 text-[7px] text-gray-400 font-bold">
                                            上次：
                                            {
                                              task.lastCompletedAt
                                                .split(" ")[0]
                                                .slice(5)
                                            }
                                          </div>
                                        )}
                                        {task.important && (
                                          <Star
                                            className={`w-3 h-3 ml-auto flex-shrink-0 ${task.completed ? "text-gray-300" : "text-yellow-500"}`}
                                            fill="currentColor"
                                          />
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </div>
                    )}
                </div>
              ))}
          </div>

          {/* Year Inbox Tasks */}
          {yearTasks.filter(
            (t) => goalsTab === "全部" || t.category === goalsTab,
          ).length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3 px-1">
                <LayoutGrid className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-gray-800">年待整理</h3>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">
                  {
                    yearTasks.filter(
                      (t) => goalsTab === "全部" || t.category === goalsTab,
                    ).length
                  }
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {yearTasks
                  .filter((t) => goalsTab === "全部" || t.category === goalsTab)
                  .map((task) => renderTaskRow(task, "year", () => toggleItemCompletion("year", task.id)))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderYear = () => null;

  const renderSomeday = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4"
    >
      <header className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            将来
          </h2>
          <p className="text-gray-400 text-[10px] mt-0.5">
            记录你暂时未计划的灵感和长远期待
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              if (isSelectionMode) {
                setIsSelectionMode(false);
                setSelectedTasks([]);
              } else {
                setIsSelectionMode(true);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${isSelectionMode ? "bg-emerald-100 text-emerald-700" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {isSelectionMode ? "取消多选" : "多选"}
          </button>
          <button
            onClick={() => {
              setGoalType("someday");
              setIsGoalModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">新目标</span>
          </button>
        </div>
      </header>

      {renderCategoryBar(somedayTab, setSomedayTab)}

      <section className="grid grid-cols-1 gap-3">
        {somedayGoals
          .filter((p) => somedayTab === "全部" || p.category === somedayTab)
          .map((p) => (
            <div
              key={p.id}
              className="fluent-card group cursor-pointer border border-gray-100 hover:ring-2 ring-purple-500/20 hover:border-purple-200 transition-all rounded-xl flex flex-col overflow-hidden bg-white shadow-sm"
            >
              <PressableItem
                className="p-3 pb-2 flex-1 flex flex-col"
                onClick={() => {
                  setGoalType("someday");
                  setEditingGoal(p);
                  setIsGoalModalOpen(true);
                }}
                onLongPress={() => {
                  setActionSheetConfig({
                    id: p.id,
                    title: p.name,
                    type: "goal",
                    onEdit: () => {
                      setGoalType("someday");
                      setEditingGoal(p);
                      setIsGoalModalOpen(true);
                    },
                    onDelete: () => {
                      if (window.confirm(`确定要彻底删除目标 "${p.name}" 吗？`)) {
                        handleDeleteGoal(p.id, "someday");
                      }
                    }
                  });
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1 mr-2">
                    <h4 className="font-bold text-gray-800 text-sm truncate">
                      {p.name}
                    </h4>
                    <span className="text-[9px] text-gray-400">
                      {p.startDate ? `${p.startDate} 至 ` : "时间: "}{p.date}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-${p.color}-50 text-${p.color}-600 border border-${p.color}-100`}
                  >
                    {p.progress === 100 ? "已完成" : "将来"}
                  </span>
                </div>
                <div className="space-y-1 mb-1 mt-auto leading-none">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-gray-400">进展</span>
                    <span
                      className={
                        p.progress > 50 ? "text-purple-600" : "text-gray-400"
                      }
                    >
                      {p.progress}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full bg-${p.color}-600 rounded-full`}
                    />
                  </div>
                </div>
              </PressableItem>

              {/* Key Results - Only show Important tasks and their KRs */}
              {p.keyResults &&
                p.keyResults.some((kr) =>
                  kr.tasks.some((t) => t.important),
                ) && (
                  <div className="bg-gray-50 border-t border-gray-100 px-2 md:px-3 py-1.5 md:py-2.5 space-y-2 mt-auto shadow-inner">
                    {p.keyResults
                      .filter((kr) => kr.tasks.some((t) => t.important))
                      .map((kr, krIdx) => (
                        <div key={kr.id} className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1 h-1 rounded-full bg-purple-400`}></div>
                            <h5 className="text-[10px] font-bold text-gray-700 truncate mr-1">
                              KR: {kr.name}
                            </h5>
                          </div>
                          <div className="space-y-1">
                            {kr.tasks
                              .filter((task) => task.important)
                              .map((task) => (
                                <div
                                  key={task.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleKRTask("someday", p.id, kr.id, task.id);
                                  }}
                                  className={`flex items-center gap-2 group/task cursor-pointer py-1.5 px-2 rounded-lg transition-colors border ${task.completed ? "bg-white/60 border-transparent" : "bg-white border-gray-200 hover:border-purple-300 hover:ring-1 ring-purple-500/10"}`}
                                >
                                  <button className="flex-shrink-0 mt-0.5">
                                    {task.completed ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded border border-gray-300 group-hover/task:border-purple-400 transition-colors bg-white"></div>
                                    )}
                                  </button>
                                  <div className="flex flex-col min-w-0 flex-1 leading-tight">
                                    <span
                                      className={`text-[10px] md:text-[11px] font-bold truncate transition-colors ${task.completed ? "text-gray-400 line-through font-medium" : "text-gray-700"}`}
                                    >
                                      {task.text}
                                    </span>
                                  </div>
                                  {task.important && (
                                    <Star
                                      className={`w-3 h-3 ml-auto flex-shrink-0 ${task.completed ? "text-gray-300" : "text-yellow-500"}`}
                                      fill="currentColor"
                                    />
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
            </div>
          ))}
        <div className="h-6" /> {/* Spacer */}
      </section>

      {/* Bottom Inbox Tasks for somedayTasks */}
      {somedayTasks.filter(
        (t) => somedayTab === "全部" || t.category === somedayTab,
      ).length > 0 && (
        <div className="mt-8 mb-4">
          <div className="flex items-center gap-2 mb-3 px-1">
            <LayoutGrid className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-gray-800">待整理</h3>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full ml-1">
              {
                somedayTasks.filter(
                  (t) => somedayTab === "全部" || t.category === somedayTab,
                ).length
              }
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {somedayTasks
              .filter((t) => somedayTab === "全部" || t.category === somedayTab)
              .map((task) => renderTaskRow(task, "someday", () => toggleItemCompletion("someday", task.id)))}
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderInbox = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6 pb-20"
    >
      <header className="flex items-center gap-4 mb-5">
        <button
          onClick={() => setActiveTab("today")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h2 className="text-3xl font-bold text-gray-900">收集箱</h2>
      </header>

      <div className="space-y-3">
        {inboxTasks.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>收集箱是空的</p>
          </div>
        ) : (
          inboxTasks.map((task) => (
            <PressableItem
              key={task.id}
              onLongPress={() => openTaskActionSheet(task, "inbox")}
              className="fluent-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-700 leading-tight">
                    {task.text}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {task.startDate && (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CalendarDays className="w-2.5 h-2.5" />
                        {task.startDate} 开始
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {task.dueDate} 截止
                      </span>
                    )}
                    {task.lastCompletedAt && (
                      <span className="absolute bottom-1 right-3 text-[9px] text-gray-300 font-bold">
                        上次：{task.lastCompletedAt.split(" ")[0].slice(5)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteInboxTask(task.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (archivingTaskId === task.id) {
                        setArchivingTaskId(null);
                      } else {
                        setArchivingTaskId(task.id);
                        setArchiveActionable(null);
                        setArchive2Min(null);
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    {archivingTaskId === task.id ? "取消" : "归档"}
                  </button>
                </div>
              </div>

              {archivingTaskId === task.id && (
                <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-200/60 flex flex-col gap-4 mt-2">
                  {/* 分类选择 */}
                  <div className="flex items-center justify-between pt-1 pb-1">
                    <span className="text-sm font-bold text-gray-700">分类</span>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {["工作", "个人", "学习", "健康"].map((cat) => (
                        <button
                          key={cat}
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchiveCategory(cat);
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${archiveCategory === cat ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 第一行: 能否行动 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">
                      能否行动？
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchiveActionable(true);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${archiveActionable === true ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                      >
                        是
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchiveActionable(false);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${archiveActionable === false ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                      >
                        否
                      </button>
                    </div>
                  </div>

                  {/* 选否: 有时间/无时间 */}
                  {archiveActionable === false && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveTo(task, "wait");
                        }}
                        className="flex-1 px-2 py-2 bg-white hover:bg-emerald-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                      >
                        <span>有时间</span>
                        <span className="text-[10px] font-normal text-gray-400">
                          周页等待分类
                        </span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveTo(task, "someday");
                        }}
                        className="flex-1 px-2 py-2 bg-white hover:bg-emerald-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                      >
                        <span>无时间</span>
                        <span className="text-[10px] font-normal text-gray-400">
                          归档到将来页
                        </span>
                      </button>
                    </div>
                  )}

                  {/* 选是: 能否2分钟完成 */}
                  {archiveActionable === true && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <span className="text-sm font-bold text-gray-700 truncate mr-2">
                        能否2分钟完成？
                      </span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveTo(task, "temp");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-600 border border-gray-200 hover:bg-emerald-50 transition-colors"
                        >
                          是 (加到今日)
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setArchive2Min(false);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${archive2Min === false ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}
                        >
                          否
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 能否2分钟完成选否: 下一步 */}
                  {archiveActionable === true && archive2Min === false && (
                    <div className="pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <span className="text-sm font-bold text-gray-700 block mb-3">
                        下一步：
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveTo(task, "repeat");
                          }}
                          className="flex-1 px-1 py-2 bg-white hover:bg-emerald-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                        >
                          <span>固定周期</span>
                          <span className="text-[9px] font-normal text-gray-400">
                            周页重复
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveTo(task, "month");
                          }}
                          className="flex-1 px-1 py-2 bg-white hover:bg-emerald-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                        >
                          <span>短期</span>
                          <span className="text-[9px] font-normal text-gray-400">
                            归档到月
                          </span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveTo(task, "year");
                          }}
                          className="flex-1 px-1 py-2 bg-white hover:bg-emerald-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                        >
                          <span>长期</span>
                          <span className="text-[9px] font-normal text-gray-400">
                            归档到年
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </PressableItem>
          ))
        )}
      </div>

      {/* Inbox Input */}
      <div className="mt-4 px-4 pb-20">
        <div className="max-w-2xl mx-auto acrylic bg-white/70 backdrop-blur-xl rounded-lg shadow-2xl flex items-center p-1.5 border border-white/60">
          <input
            autoFocus
            type="text"
            placeholder="添加到收集箱..."
            className="flex-1 bg-transparent border-none focus:ring-0 px-4 text-gray-700 placeholder:text-gray-400 font-bold text-sm"
            value={inboxValue}
            onChange={(e) => setInboxValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddInboxTask();
              }
            }}
          />
          <button
            onClick={handleAddInboxTask}
            className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderAllTasks = () => {
    const allTasks = [
      ...scheduledTasks,
      ...tempTasks,
      ...inboxTasks,
      ...weekWaitTasks,
      ...weekRepeatTasks,
      ...weekNextTasks,
      ...Object.values(weekTasksByDay).flat(),
      ...monthTasks,
      ...yearTasks,
      ...somedayTasks,
    ];

    const filteredTasks = allTasks.filter(
      (t) => allTasksTab === "全部" || t.category === allTasksTab,
    );

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="space-y-4"
      >
        <header className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              全部任务
            </h2>
            <p className="text-gray-400 text-[10px] mt-0.5">
              查看你的所有清单与计划
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                if (isSelectionMode) {
                  setIsSelectionMode(false);
                  setSelectedTasks([]);
                } else {
                  setIsSelectionMode(true);
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${isSelectionMode ? "bg-emerald-100 text-emerald-700" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {isSelectionMode ? "取消多选" : "多选"}
            </button>
          </div>
        </header>

        {renderCategoryBar(allTasksTab, setAllTasksTab)}

        <div className="space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-white/50 rounded-xl border border-dashed border-gray-200">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Search className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-[10px] font-medium text-gray-400">
                没有找到相关任务
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredTasks.map((task) => renderTaskRow(task, "all", () => {
                      if (scheduledTasks.some((t) => t.id === task.id))
                        setScheduledTasks(
                          scheduledTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (tempTasks.some((t) => t.id === task.id))
                        setTempTasks(
                          tempTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (inboxTasks.some((t) => t.id === task.id))
                        setInboxTasks(
                          inboxTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (weekWaitTasks.some((t) => t.id === task.id))
                        setWeekWaitTasks(
                          weekWaitTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (weekRepeatTasks.some((t) => t.id === task.id))
                        setWeekRepeatTasks(
                          weekRepeatTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (weekNextTasks.some((t) => t.id === task.id))
                        setWeekNextTasks(
                          weekNextTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (monthTasks.some((t) => t.id === task.id))
                        setMonthTasks(
                          monthTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (yearTasks.some((t) => t.id === task.id))
                        setYearTasks(
                          yearTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
                      if (somedayTasks.some((t) => t.id === task.id))
                        setSomedayTasks(
                          somedayTasks.map((t) =>
                            t.id === task.id
                              ? { ...t, completed: !t.completed }
                              : t,
                          ),
                        );
              }))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderCategoryBar = (
    currentTab: string,
    setTab: (t: string) => void,
  ) => {
    return (
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar items-center pb-1 -mx-4 px-4">
        {[
          { tag: "全部", label: "全部" },
          ...userCategories.map((c) => ({ tag: c, label: c })),
        ].map((item) => (
          <PressableItem
            key={item.tag}
            onLongPress={() => {
              if (item.tag === "全部") return;
              const action = window.confirm(
                `要删除或编辑分类 "${item.tag}" 吗？\n确定: 删除\n取消: 编辑`,
              );
              if (action) {
                setUserCategories(userCategories.filter((c) => c !== item.tag));
                if (currentTab === item.tag) setTab("全部");
              } else {
                const newName = window.prompt("输入新名称:", item.tag);
                if (newName && newName.trim() && newName !== item.tag) {
                  setUserCategories(
                    userCategories.map((c) =>
                      c === item.tag ? newName.trim() : c,
                    ),
                  );
                  if (currentTab === item.tag) setTab(newName.trim());
                }
              }
            }}
          >
            <button
              onClick={() => setTab(item.tag)}
              className={`px-4 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border shadow-sm ${
                currentTab === item.tag
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-200/50"
                  : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {item.tag}
            </button>
          </PressableItem>
        ))}
        <button
          onClick={() => {
            const name = window.prompt("输入新分类名称:");
            if (name && name.trim() && !userCategories.includes(name.trim())) {
              setUserCategories([...userCategories, name.trim()]);
            }
          }}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-gray-50 border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 transition-all ml-0.5"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const handleSaveNewTask = () => {
    if (newTaskData.name.trim()) {
      const newTask: TodoItem = {
        id: `nw-${Date.now()}`,
        text: newTaskData.name,
        completed: false,
        category: newTaskData.category,
        notes: newTaskData.notes,
        subtasks: newTaskData.subtasks,
        startDate: newTaskData.startDate,
        dueDate: newTaskData.dueDate,
        linkedKR: newTaskData.linkedKR,
        taskType:
          newTaskData.type === "等待"
            ? "waiting"
            : newTaskData.type === "下一步"
              ? "next"
              : newTaskData.type === "重复事项"
                ? "recurring"
                : "normal",
        targetCount: newTaskData.targetCount,
        repeatUnit: newTaskData.repeatUnit,
        repeatFrequency: newTaskData.repeatFrequency,
      };

      // Save to appropriate list
      if (activeTab === "month") {
        setMonthTasks([...monthTasks, newTask]);
      } else if (activeTab === "someday") {
        setSomedayTasks([...somedayTasks, newTask]);
      } else if (
        activeTab === "inbox" ||
        activeTab === "all"
      ) {
        setInboxTasks([...inboxTasks, newTask]);
      } else if (newTaskData.type === "等待") {
        setWeekWaitTasks([...weekWaitTasks, newTask]);
      } else if (newTaskData.type === "下一步") {
        setWeekNextTasks([...weekNextTasks, newTask]);
      } else if (newTaskData.type === "重复事项") {
        setWeekRepeatTasks([...weekRepeatTasks, newTask]);
      } else {
        // Default to inbox
        setInboxTasks([...inboxTasks, newTask]);
      }

      // Sync with Goal KR if linked
      if (newTaskData.linkedKR) {
        const syncWithGoals = (goals: Goal[]) =>
          goals.map((g) => {
            const kr = g.keyResults?.find(
              (kr) => kr.id === newTaskData.linkedKR,
            );
            if (!kr) return g;
            return {
              ...g,
              keyResults: g.keyResults?.map((k) =>
                k.id === kr.id
                  ? {
                      ...k,
                      tasks: [
                        ...k.tasks,
                        {
                          id: newTask.id,
                          text: newTask.text,
                          completed: false,
                          important: !!newTask.important,
                        },
                      ],
                    }
                  : k,
              ),
            };
          });
        setMonthGoals(syncWithGoals(monthGoals));
        setYearGoals(syncWithGoals(yearGoals));
        setSomedayGoals(syncWithGoals(somedayGoals));
      }

      setIsNewTaskModalOpen(false);
      setNewTaskData({
        name: "",
        category: "工作",
        notes: "",
        subtasks: [] as SubTask[],
        type: "下一步",
        targetCount: 1,
        repeatUnit: "week",
        repeatFrequency: 1,
        startDate: "",
        dueDate: "",
        linkedKR: "",
      });
      setNewTaskStep(1);
    }
  };

  const renderNewTaskModal = () => (
    <AnimatePresence>
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNewTaskModalOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-white sm:rounded-lg rounded-t-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-emerald-100/50 bg-emerald-50/50 z-10 sticky top-0">
              {newTaskStep === 1 ? (
                <div className="w-8" />
              ) : (
                <button
                  onClick={() => setNewTaskStep(1)}
                  className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-600 hover:text-emerald-900 bg-white shadow-sm border border-emerald-100/50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <h3 className="font-bold text-lg text-emerald-900">
                {newTaskStep === 1 ? "新增任务" : "更多设置"}
              </h3>
              <button
                onClick={() => setIsNewTaskModalOpen(false)}
                className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors text-emerald-500 hover:text-emerald-900 bg-white shadow-sm border border-emerald-100/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {newTaskStep === 1 ? (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                      任务名称
                    </label>
                    <input
                      autoFocus
                      type="text"
                      placeholder="想做什么？"
                      value={newTaskData.name}
                      onChange={(e) =>
                        setNewTaskData({ ...newTaskData, name: e.target.value })
                      }
                      className="w-full bg-white border border-gray-200/60 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 focus-within:z-20">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                      任务类型
                    </label>
                    <div className="flex w-full gap-1 p-1 bg-gray-100/80 rounded-lg">
                      {["等待", "下一步", "重复事项"].map((type) => (
                        <button
                          key={type}
                          onClick={() =>
                            setNewTaskData({ ...newTaskData, type })
                          }
                          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                            newTaskData.type === type
                              ? "bg-white text-emerald-600 shadow-sm"
                              : "text-gray-500 hover:text-emerald-600 hover:bg-gray-50/50"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                      任务分类
                    </label>
                    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 p-1 bg-gray-100/80 rounded-lg">
                      {["工作", "个人", "健康", "财务", "学习", "旅行", "创意"].map(
                        (cat) => (
                          <button
                            key={cat}
                            onClick={() =>
                              setNewTaskData({ ...newTaskData, category: cat })
                            }
                            className={`flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                              newTaskData.category === cat
                                ? "bg-white text-emerald-600 shadow-sm"
                                : "text-gray-500 hover:text-emerald-600 hover:bg-gray-50/50"
                            }`}
                          >
                            {cat}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 开始日期
                      </label>
                      <input
                        type="date"
                        value={newTaskData.startDate}
                        onChange={(e) =>
                          setNewTaskData({
                            ...newTaskData,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-gray-200/60 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm text-gray-700"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 截止日期
                      </label>
                      <input
                        type="date"
                        value={newTaskData.dueDate}
                        onChange={(e) =>
                          setNewTaskData({
                            ...newTaskData,
                            dueDate: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-gray-200/60 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm text-gray-700"
                      />
                    </div>
                  </div>

                  {newTaskData.type === "重复事项" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                        重复设定
                      </label>
                      <div className="p-3 bg-gray-50/80 border border-gray-100 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">每隔</span>
                            <input
                              type="number"
                              min="1"
                              value={newTaskData.repeatFrequency}
                              onChange={(e) =>
                                setNewTaskData({
                                  ...newTaskData,
                                  repeatFrequency: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-14 bg-white border border-gray-200 rounded-lg py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                            />
                          </div>
                          <div className="flex gap-1 p-1 bg-gray-200/50 rounded-lg">
                            {(["day", "week", "month"] as const).map((unit) => (
                              <button
                                key={unit}
                                onClick={() => setNewTaskData({ ...newTaskData, repeatUnit: unit })}
                                className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                                  newTaskData.repeatUnit === unit
                                    ? "bg-white text-emerald-600 shadow-sm"
                                    : "text-gray-500 hover:text-emerald-600"
                                }`}
                              >
                                {unit === "day" ? "日" : unit === "week" ? "周" : "月"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">周期内完成目标</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={newTaskData.targetCount}
                              onChange={(e) =>
                                setNewTaskData({
                                  ...newTaskData,
                                  targetCount: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-14 bg-white border border-gray-200 rounded-lg py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all"
                            />
                            <span className="text-xs font-bold text-gray-400">次</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                      备注
                    </label>
                    <textarea
                      placeholder="添加一些细节..."
                      value={newTaskData.notes}
                      onChange={(e) =>
                        setNewTaskData({
                          ...newTaskData,
                          notes: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-gray-200/60 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all min-h-[60px] max-h-[120px] shadow-sm resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                      关联关键结果 (KR)
                    </label>
                    <select
                      value={newTaskData.linkedKR}
                      onChange={(e) =>
                        setNewTaskData({
                          ...newTaskData,
                          linkedKR: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-gray-200/60 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm text-gray-700"
                    >
                      <option value="">选择关联的目标或KR...</option>
                      {[...weekGoals, ...monthGoals, ...yearGoals, ...somedayGoals].map(
                        (g) => (
                          <optgroup key={g.id} label={g.name}>
                            {g.keyResults?.map((kr) => (
                              <option key={kr.id} value={kr.id}>
                                {kr.name}
                              </option>
                            ))}
                          </optgroup>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                      子任务
                    </label>
                    <div className="space-y-2 bg-white px-3 py-2 rounded-lg border border-gray-200/60 shadow-sm">
                      {newTaskData.subtasks.map((st, i) => (
                        <div
                          key={st.id}
                          className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-b-0"
                        >
                          <button
                            onClick={() => {
                              const newSub = [...newTaskData.subtasks];
                              newSub[i] = {
                                ...newSub[i],
                                completed: !newSub[i].completed,
                              };
                              setNewTaskData({
                                ...newTaskData,
                                subtasks: newSub,
                              });
                            }}
                            className="transition-colors"
                          >
                            {st.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                          <span
                            className={`text-sm font-medium flex-1 ${st.completed ? "text-gray-400 line-through" : "text-gray-700"}`}
                          >
                            {st.text}
                          </span>
                          <button
                            onClick={() =>
                              setNewTaskData({
                                ...newTaskData,
                                subtasks: newTaskData.subtasks.filter(
                                  (_, idx) => idx !== i,
                                ),
                              })
                            }
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 py-1">
                        <Plus className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="添加子任务并按回车..."
                          className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-400"
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              e.currentTarget.value.trim()
                            ) {
                              setNewTaskData({
                                ...newTaskData,
                                subtasks: [
                                  ...newTaskData.subtasks,
                                  {
                                    id: Date.now().toString(),
                                    text: e.currentTarget.value.trim(),
                                    completed: false,
                                  },
                                ],
                              });
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 bg-emerald-50/30 border-t border-emerald-100/50 flex gap-3 pb-safe items-center sticky bottom-0">
              {newTaskStep === 1 ? (
                <>
                  <button
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    取消
                  </button>
                  <button
                    disabled={!newTaskData.name.trim()}
                    onClick={() => setNewTaskStep(2)}
                    className="px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                  >
                    更多
                  </button>
                  <button
                    disabled={!newTaskData.name.trim()}
                    onClick={handleSaveNewTask}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    保存 <Check className="w-4 h-4 text-emerald-100" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveNewTask}
                    className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-emerald-600/20 active:scale-95 transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
                  >
                    确认创建 <Check className="w-4 h-4 text-emerald-100" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  const renderEditTaskModal = () => {
    if (!editingTask) return null;

    return (
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white sm:rounded-lg rounded-t-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 z-10 sticky top-0">
                {editTaskStep === 1 ? (
                  <div className="w-8" />
                ) : (
                  <button
                    onClick={() => setEditTaskStep(1)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-900 bg-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h3 className="font-bold text-lg text-gray-900">
                  {editTaskStep === 1 ? "编辑任务" : "更多设置"}
                </h3>
                <button
                  onClick={() => setEditingTask(null)}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-900 bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {editTaskStep === 1 ? (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                        任务名称
                      </label>
                      <input
                        autoFocus
                        type="text"
                        placeholder="想做什么？"
                        value={editingTask.text}
                        onChange={(e) =>
                          setEditingTask({
                            ...editingTask,
                            text: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-gray-200/60 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                        任务类型
                      </label>
                      <div className="flex w-full gap-1 p-1 bg-gray-100/80 rounded-lg">
                        {["等待", "下一步", "重复事项"].map((typeLabel) => {
                          const val =
                            typeLabel === "等待"
                              ? "waiting"
                              : typeLabel === "下一步"
                                ? "next"
                                : "recurring";
                          return (
                            <button
                              key={typeLabel}
                              onClick={() =>
                                setEditingTask({
                                  ...editingTask,
                                  taskType: val,
                                })
                              }
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                                editingTask.taskType === val
                                  ? "bg-white text-emerald-600 shadow-sm"
                                  : "text-gray-500 hover:text-emerald-600 hover:bg-gray-50/50"
                              }`}
                            >
                              {typeLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                        任务分类
                      </label>
                      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 p-1 bg-gray-100/80 rounded-lg">
                        {userCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() =>
                              setEditingTask({ ...editingTask, category: cat })
                            }
                            className={`flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                              editingTask.category === cat
                                ? "bg-white text-emerald-600 shadow-sm"
                                : "text-gray-500 hover:text-emerald-600 hover:bg-gray-50/50"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> 开始日期
                        </label>
                        <input
                          type="date"
                          value={editingTask.startDate || ""}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              startDate: e.target.value,
                            })
                          }
                          className="w-full bg-white border border-gray-200/60 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm text-gray-700"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> 截止日期
                        </label>
                        <input
                          type="date"
                          value={editingTask.dueDate || ""}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              dueDate: e.target.value,
                            })
                          }
                          className="w-full bg-white border border-gray-200/60 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm text-gray-700"
                        />
                      </div>
                    </div>

                    {editingTask.taskType === "recurring" && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                          重复设定
                        </label>
                        <div className="p-3 bg-gray-50/80 border border-gray-100 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase">每隔</span>
                              <input
                                type="number"
                                min="1"
                                value={editingTask.repeatFrequency || 1}
                                onChange={(e) =>
                                  setEditingTask({
                                    ...editingTask,
                                    repeatFrequency:
                                      parseInt(e.target.value) || 1,
                                  })
                                }
                                className="w-14 bg-white border border-gray-200 rounded-lg py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-gray-700"
                              />
                            </div>
                            <div className="flex gap-1 p-1 bg-gray-200/50 rounded-lg">
                              {(["day", "week", "month"] as const).map((unit) => (
                                <button
                                  key={unit}
                                  onClick={() => setEditingTask({ ...editingTask, repeatUnit: unit })}
                                  className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                                    editingTask.repeatUnit === unit
                                      ? "bg-white text-emerald-600 shadow-sm"
                                      : "text-gray-500 hover:text-emerald-600"
                                  }`}
                                >
                                  {unit === "day" ? "日" : unit === "week" ? "周" : "月"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">周期内完成目标</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={editingTask.targetCount || 1}
                                onChange={(e) =>
                                  setEditingTask({
                                    ...editingTask,
                                    targetCount: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="w-14 bg-white border border-gray-200 rounded-lg py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition-all text-gray-700"
                              />
                              <span className="text-xs font-bold text-gray-400">次</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                        备注
                      </label>
                      <textarea
                        placeholder="添加一些细节..."
                        value={editingTask.notes || ""}
                        onChange={(e) =>
                          setEditingTask({
                            ...editingTask,
                            notes: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-gray-200/60 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all min-h-[60px] max-h-[120px] shadow-sm resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                        关联关键结果 (KR)
                      </label>
                      <select
                        value={editingTask.linkedKR || ""}
                        onChange={(e) =>
                          setEditingTask({
                            ...editingTask,
                            linkedKR: e.target.value,
                          })
                        }
                        className="w-full bg-white border border-gray-200/60 rounded-lg px-4 py-3 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm text-gray-700"
                      >
                        <option value="">选择关联的目标或KR...</option>
                        {[...monthGoals, ...yearGoals, ...somedayGoals].map(
                          (g) => (
                            <optgroup key={g.id} label={g.name}>
                              {g.keyResults?.map((kr) => (
                                <option key={kr.id} value={kr.id}>
                                  {kr.name}
                                </option>
                              ))}
                            </optgroup>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                        子任务
                      </label>
                      <div className="space-y-2 bg-white px-3 py-2 rounded-lg border border-gray-200/60 shadow-sm">
                        {(editingTask.subtasks || []).map((st, i) => (
                          <div
                            key={st.id}
                            className="flex items-center gap-2 py-1 border-b border-gray-50 last:border-b-0"
                          >
                            <button
                              onClick={() => {
                                const newSub = [
                                  ...(editingTask.subtasks || []),
                                ];
                                newSub[i] = {
                                  ...newSub[i],
                                  completed: !newSub[i].completed,
                                };
                                setEditingTask({
                                  ...editingTask,
                                  subtasks: newSub,
                                });
                              }}
                              className="transition-colors"
                            >
                              {st.completed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-gray-300" />
                              )}
                            </button>
                            <span
                              className={`text-sm font-medium flex-1 ${st.completed ? "text-gray-400 line-through" : "text-gray-700"}`}
                            >
                              {st.text}
                            </span>
                            <button
                              onClick={() =>
                                setEditingTask({
                                  ...editingTask,
                                  subtasks: (editingTask.subtasks || []).filter(
                                    (_, idx) => idx !== i,
                                  ),
                                })
                              }
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 py-1">
                          <Plus className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="添加子任务并按回车..."
                            className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-400"
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                e.currentTarget.value.trim()
                              ) {
                                setEditingTask({
                                  ...editingTask,
                                  subtasks: [
                                    ...(editingTask.subtasks || []),
                                    {
                                      id: Date.now().toString(),
                                      text: e.currentTarget.value.trim(),
                                      completed: false,
                                    },
                                  ],
                                });
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 pb-safe items-center sticky bottom-0">
                {editTaskStep === 1 ? (
                  <>
                    <button
                      onClick={handleDeleteTask}
                      className="px-4 py-3 bg-white text-red-600 font-bold rounded-lg border border-gray-200 text-sm hover:bg-red-50 transition-colors shadow-sm"
                    >
                      删除
                    </button>
                    <button
                      disabled={!editingTask.text.trim()}
                      onClick={() => setEditTaskStep(2)}
                      className="px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                    >
                      更多
                    </button>
                    <button
                      disabled={!editingTask.text.trim()}
                      onClick={() => handleUpdateTask(editingTask)}
                      className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-sm active:scale-95 transition-transform hover:bg-emerald-700 flex items-center justify-center gap-2"
                    >
                      保存 <Check className="w-4 h-4 text-emerald-100" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleUpdateTask(editingTask)}
                      className="w-full py-3 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                      保存修改 <Check className="w-4 h-4 text-emerald-100" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  };

  const handleSaveGoal = (
    editedGoal: Omit<Goal, "id" | "progress" | "color"> & { id?: string },
    movedTaskIds: string[],
  ) => {
    let color = "blue";
    if (goalType === "week") color = "emerald";
    if (goalType === "year") color = "indigo";
    if (goalType === "someday") color = "purple";

    if (editedGoal.id) {
      // Editing existing goal
      const updateList = (list: Goal[]) =>
        list.map((g) =>
          g.id === editedGoal.id ? ({ ...g, ...editedGoal } as Goal) : g,
        );
      if (goalType === "week") setWeekGoals(updateList(weekGoals));
      else if (goalType === "month") setMonthGoals(updateList(monthGoals));
      else if (goalType === "year") setYearGoals(updateList(yearGoals));
      else setSomedayGoals(updateList(somedayGoals));
    } else {
      // Creating new goal
      const finalGoal: Goal = {
        ...editedGoal,
        id: `g-${Date.now()}`,
        progress: 0,
        color,
      };
      if (goalType === "week") setWeekGoals([...weekGoals, finalGoal]);
      else if (goalType === "month") setMonthGoals([...monthGoals, finalGoal]);
      else if (goalType === "year") setYearGoals([...yearGoals, finalGoal]);
      else setSomedayGoals([...somedayGoals, finalGoal]);
    }

    if (movedTaskIds.length > 0) {
      setInboxTasks(inboxTasks.filter((t) => !movedTaskIds.includes(t.id)));
    }

    setEditingGoal(null);
    setIsGoalModalOpen(false);
  };

  const handleDeleteGoal = (id: string, type?: "week" | "month" | "year" | "someday") => {
    const targetType = type || goalType;
    if (targetType === "week")
      setWeekGoals(weekGoals.filter((g) => g.id !== id));
    else if (targetType === "month")
      setMonthGoals(monthGoals.filter((g) => g.id !== id));
    else if (targetType === "year")
      setYearGoals(yearGoals.filter((g) => g.id !== id));
    else setSomedayGoals(somedayGoals.filter((g) => g.id !== id));
    setEditingGoal(null);
    setIsGoalModalOpen(false);
  };

  const renderReviewModal = () => (
    <AnimatePresence>
      {isReviewOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-[#fcf8f5] flex flex-col pt-10 px-0 pb-0"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 px-5 relative shrink-0">
            <h2 className="text-2xl font-black text-[#a66232]">周复盘</h2>
            <button
              onClick={() => setIsReviewOpen(false)}
              className="p-2 rounded-lg bg-black/5 hover:bg-black/10 transition-colors"
            >
              <X className="w-5 h-5 text-[#a66232]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-32">
            <div className="space-y-4">
              <div className="bg-[#fcf6f1] border border-[#f0e2d5] p-5 rounded-[16px]">
                <p className="text-[#a66232] font-medium leading-relaxed text-sm">
                  回顾本周成就，反思待改进之处，为下周做好规划。请按顺序检查以下分类：
                </p>
              </div>

              <div className="bg-white p-5 rounded-[16px] shadow-sm border border-orange-100 flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-bold text-gray-800 text-[15px]">
                    检查项目
                  </h3>
                </div>
                <p className="text-gray-500 text-xs ml-10 leading-relaxed">
                  每个项目至少有1条下一步动作。
                </p>
              </div>

              <div className="bg-white p-5 rounded-[16px] shadow-sm border border-emerald-100 flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-gray-800 text-[15px]">
                    检查等待
                  </h3>
                </div>
                <p className="text-gray-500 text-xs ml-10 leading-relaxed">
                  都有日期，该催的催，该放弃的删。
                </p>
              </div>

              <div className="bg-white p-5 rounded-[16px] shadow-sm border border-green-100 flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-gray-800 text-[15px]">
                    检查重复事项
                  </h3>
                </div>
                <p className="text-gray-500 text-xs ml-10 leading-relaxed">
                  这周哪些例行要调整。
                </p>
              </div>

              <div className="bg-white p-5 rounded-[16px] shadow-sm border border-purple-100 flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <h3 className="font-bold text-gray-800 text-[15px]">
                    清理将来
                  </h3>
                </div>
                <p className="text-gray-500 text-xs ml-10 leading-relaxed">
                  删掉一半也正常。
                </p>
              </div>

              <div className="bg-white p-5 rounded-[16px] shadow-sm border border-red-100 flex flex-col gap-1">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <h3 className="font-bold text-gray-800 text-[15px]">
                    计划下周
                  </h3>
                </div>
                <p className="text-gray-500 text-xs ml-10 leading-relaxed">
                  挑3-5个重点推进的项目。
                </p>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-5 pt-8 bg-gradient-to-t from-[#fcf8f5] via-[#fcf8f5] to-transparent shrink-0">
            <button
              onClick={() => setIsReviewOpen(false)}
              className="w-full py-4 bg-[#9b5110] text-[#fcf6f1] font-bold rounded-lg shadow-lg shadow-[#9b5110]/20 active:scale-95 transition-transform flex justify-center items-center gap-2"
            >
              完成复盘 <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );


  const renderPomodoroOverlay = () => (
    <AnimatePresence>
      {pomodoroTask && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
        >
          <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center">
            <button
              onClick={() => {
                if (isPomodoroActive) {
                  if (window.confirm("确定要放弃当前的专注吗？")) {
                    setPomodoroTask(null);
                    setIsPomodoroActive(false);
                  }
                } else {
                  setPomodoroTask(null);
                }
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${isPomodoroBreak ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"}`}>
              {isPomodoroBreak ? <Coffee className="w-10 h-10" /> : <Timer className="w-10 h-10" />}
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-1 leading-tight">
              {isPomodoroBreak ? "休息中" : "专注中"}
            </h3>
            <p className="text-gray-500 text-sm font-bold mb-8 truncate w-full px-4">
              {pomodoroTask.text}
            </p>

            <div className="text-6xl font-black text-gray-900 mb-10 tracking-tighter tabular-nums">
              {Math.floor(pomodoroTimeLeft / 60)}:
              {String(pomodoroTimeLeft % 60).padStart(2, "0")}
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={() => setIsPomodoroActive(!isPomodoroActive)}
                className={`flex-1 py-4 rounded-2xl font-black text-lg shadow-xl shadow-opacity-20 transition-all flex items-center justify-center gap-2 active:scale-95 ${
                  isPomodoroActive
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : isPomodoroBreak
                      ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                      : "bg-orange-600 text-white hover:bg-orange-700 shadow-orange-600/20"
                }`}
              >
                {isPomodoroActive ? (
                  <>
                    <Pause className="w-6 h-6 fill-current" /> 暂停
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 fill-current" /> 继续
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (window.confirm("重置计时器？")) {
                    setPomodoroTimeLeft(isPomodoroBreak ? 5 * 60 : 25 * 60);
                    setIsPomodoroActive(false);
                  }
                }}
                className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderSettingsSidebar = () => (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[160] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col border-l border-gray-100"
          >
            <div className="p-6 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-emerald-600" />
                设置
              </h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Sync Section */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                  云端同步 (WebDAV)
                </h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 ml-1">服务器地址</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none"
                      placeholder="https://dav.jianguoyun.com/dav/"
                      value={webdavConfig.url}
                      onChange={(e) => setWebdavConfig({ ...webdavConfig, url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 ml-1">用户名</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none"
                      value={webdavConfig.username}
                      onChange={(e) => setWebdavConfig({ ...webdavConfig, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 ml-1">应用密码</label>
                    <input
                      type="password"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:border-emerald-500 outline-none"
                      value={webdavConfig.password}
                      onChange={(e) => setWebdavConfig({ ...webdavConfig, password: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={handleWebDAVSync}
                    className="w-full mt-2 py-3 bg-white hover:bg-emerald-50 text-emerald-600 font-bold rounded-xl border border-emerald-100 shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Cloud className="w-4 h-4" /> 立即同步
                  </button>
                </div>
              </section>

              {/* Data Management */}
              <section className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
                  数据管理
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleExportData}
                    className="p-4 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-2xl border border-blue-100 shadow-sm transition-all flex flex-col items-center gap-2"
                  >
                    <Download className="w-6 h-6" />
                    <span className="text-xs">导出 JSON</span>
                  </button>
                  <label className="p-4 bg-white hover:bg-indigo-50 text-indigo-600 font-bold rounded-2xl border border-indigo-100 shadow-sm transition-all flex flex-col items-center gap-2 cursor-pointer">
                    <Upload className="w-6 h-6" />
                    <span className="text-xs">导入 JSON</span>
                    <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
                  </label>
                </div>
                <button
                  onClick={handleClearContent}
                  className="w-full py-4 bg-white hover:bg-red-50 text-red-500 font-bold rounded-2xl border border-red-100 shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  清除所有内容
                </button>
              </section>

              {/* Info */}
              <div className="pt-10 text-center">
                <p className="text-[10px] text-gray-400 font-medium">版本 2.1.0 · Fluent Design</p>
                <p className="text-[10px] text-gray-300 mt-1">Made with Love for Productivity</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  const renderActionSheet = () => (
    <AnimatePresence>
      {actionSheetConfig && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center p-0 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setActionSheetConfig(null)}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden pb-safe"
          >
            <div className="p-4 items-center justify-center flex border-b border-gray-100 relative">
              <h3 className="font-bold text-[15px] text-gray-800 truncate max-w-[80%]">
                {actionSheetConfig.title}
              </h3>
            </div>
            <div className="flex flex-col p-2 space-y-1 bg-gray-50/50">
              {actionSheetConfig.type !== "goal" && (
                <button
                  onClick={() => {
                    // Find the task object if possible to start pomodoro
                    // The actionSheetConfig might only have id/title depending on how it's called
                    // But for tasks it should have enough info
                    const task = [...scheduledTasks, ...tempTasks, ...inboxTasks, ...monthTasks, ...yearTasks, ...somedayTasks, ...weekWaitTasks, ...weekRepeatTasks, ...weekNextTasks].find(t => t.id === actionSheetConfig.id);
                    if (task) {
                      startPomodoro(task);
                    } else {
                      // Fallback for tasks not in common lists (like plannedTasks which has slightly different type)
                      startPomodoro({ id: actionSheetConfig.id, text: actionSheetConfig.title, completed: false });
                    }
                    setActionSheetConfig(null);
                  }}
                  className="w-full py-4 bg-white hover:bg-orange-50 text-orange-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm border border-orange-100"
                >
                  <Timer className="w-4 h-4 text-orange-500" />
                  番茄钟专注
                </button>
              )}
              <button
                onClick={() => {
                  actionSheetConfig.onEdit();
                  setActionSheetConfig(null);
                }}
                className="w-full py-4 bg-white hover:bg-emerald-50 text-gray-800 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm border border-gray-100"
              >
                <Edit2 className="w-4 h-4 text-emerald-500" />
                编辑内容
              </button>
              <button
                onClick={() => {
                  actionSheetConfig.onDelete();
                  setActionSheetConfig(null);
                }}
                className="w-full py-4 bg-white hover:bg-red-50 text-red-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm border border-gray-100"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                彻底删除
              </button>
            </div>
            <div className="p-2 pt-0 bg-gray-50/50">
              <button
                onClick={() => setActionSheetConfig(null)}
                className="w-full py-4 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 font-bold rounded-xl transition-colors shadow-sm border border-gray-100"
              >
                取消
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-fluent-bg font-sans overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Background Decorative Blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-100/30 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-50/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      <main className="max-w-screen-xl mx-auto px-4 pt-6 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === "today" && renderToday()}
          {activeTab === "week" && renderWeek()}
          {activeTab === "month" && renderGoals()}
          {activeTab === "someday" && renderSomeday()}
          {activeTab === "inbox" && renderInbox()}
          {activeTab === "all" && renderAllTasks()}
        </AnimatePresence>
      </main>

      {renderNewTaskModal()}
      {renderReviewModal()}
      <GoalModalComponent
        isOpen={isGoalModalOpen || !!editingGoal}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        goalType={goalType}
        inboxTasks={inboxTasks}
        initialData={editingGoal}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
      />
      {renderActionSheet()}
      {renderEditTaskModal()}
      {renderSettingsSidebar()}
      {renderPomodoroOverlay()}

      {/* Batch Actions Bar */}
      <AnimatePresence>
        {isSelectionMode && selectedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-[90px] px-2 left-0 right-0 z-[90] max-w-screen-md mx-auto pointer-events-none"
          >
             <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between border border-gray-800 pointer-events-auto">
              <div className="flex items-center gap-3 pl-1">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold shadow-sm">
                  {selectedTasks.length}
                </div>
                <span className="text-sm md:text-base font-bold">已选择</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBatchCategoryModal(true)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-bold"
                >
                  移动到分类
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-4 py-2 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors text-sm font-bold"
                >
                  删除
                </button>
              </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch Category Select Modal */}
      <AnimatePresence>
        {showBatchCategoryModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setShowBatchCategoryModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-[#fcf8f5] w-full sm:w-[400px] h-[70vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl relative flex flex-col overflow-hidden will-change-transform"
            >
              <div className="p-5 flex-shrink-0 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold text-gray-900 text-center flex-1">
                  选择新分类
                </h3>
                <button
                  onClick={() => setShowBatchCategoryModal(false)}
                  className="absolute right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-2 pb-safe">
                {["无分类", ...userCategories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleBatchMoveToCategory(cat === "无分类" ? "" : cat)}
                    className="w-full p-4 bg-white/80 rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md text-left font-bold text-gray-700 transition"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation & Add Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe flex justify-center pointer-events-none">
        <div className="max-w-md w-full flex flex-row items-center gap-2 pointer-events-auto">
          <nav className="flex-1 overflow-hidden acrylic bg-white/70 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 h-[60px] flex items-center">
            <div className="flex-1 flex overflow-x-auto no-scrollbar px-1.5 gap-0.5 justify-between h-full items-center">
              <NavItem
                active={activeTab === "today"}
                onClick={() => setActiveTab("today")}
                icon={<CalendarDays className="w-5 h-5" />}
                label="今日"
              />
              <NavItem
                active={activeTab === "week"}
                onClick={() => setActiveTab("week")}
                icon={<Columns className="w-5 h-5" />}
                label="周"
              />
              <NavItem
                active={activeTab === "month"}
                onClick={() => setActiveTab("month")}
                icon={<Target className="w-5 h-5" />}
                label="目标"
              />
              <NavItem
                active={activeTab === "someday"}
                onClick={() => setActiveTab("someday")}
                icon={<Compass className="w-5 h-5" />}
                label="将来"
              />
              <NavItem
                active={activeTab === "all"}
                onClick={() => setActiveTab("all")}
                icon={<LayoutGrid className="w-5 h-5" />}
                label="全部"
              />
            </div>
          </nav>
          <AnimatePresence>
            {activeTab !== "inbox" && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => {
                  if (activeTab === "today") {
                    setActiveTab("inbox");
                  } else {
                    setIsNewTaskModalOpen(true);
                    setNewTaskStep(1);
                  }
                }}
                className="flex-shrink-0 w-[60px] h-[60px] bg-emerald-600/90 backdrop-blur-xl text-white rounded-xl shadow-xl shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-500 hover:shadow-emerald-500/40 transition-all z-50 active:scale-95 focus:ring-4 focus:ring-emerald-100 border border-emerald-400/20"
              >
                {activeTab === "today" ? (
                  <Inbox className="w-6 h-6" />
                ) : (
                  <Plus className="w-7 h-7" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 px-2.5 h-[50px] rounded-lg transition-all duration-300 relative flex-shrink-0 ${active ? "text-emerald-600" : "text-gray-500 hover:text-gray-700"}`}
    >
      <div
        className={`transition-transform duration-300 ${active ? "scale-105" : "scale-100"}`}
      >
        {icon}
      </div>
      <span
        className={`text-[9.5px] font-bold tracking-wide whitespace-nowrap ${active ? "opacity-100" : "opacity-70"}`}
      >
        {label}
      </span>
      {active && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 bg-emerald-50/60 rounded-lg -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}
