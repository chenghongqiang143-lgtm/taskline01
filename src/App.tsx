/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CalendarDays, 
  CalendarCheck, 
  Columns, 
  Calendar, 
  CalendarRange, 
  Compass, 
  Plus, 
  Settings, 
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
  ListTodo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type TabType = 'today' | 'week' | 'month' | 'year' | 'someday' | 'inbox';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  category?: string;
}

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
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [inboxValue, setInboxValue] = useState('');
  const [inboxTasks, setInboxTasks] = useState<{id: string, text: string, createdAt: Date}[]>([]);

  // New Task Modal States
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskStep, setNewTaskStep] = useState(1);
  const [newTaskData, setNewTaskData] = useState({
    name: '',
    category: '',
    notes: '',
    subtasks: [] as string[],
    type: '临时待办', // 临时待办, 重复事项, 安排任务
    targetCount: 1,
    dueDate: '',
    linkedKR: ''
  });

  // States for Today page tasks
  const [scheduledTasks, setScheduledTasks] = useState<TodoItem[]>([
    { id: 'st-1', text: '早晨瑜伽', completed: false },
    { id: 'st-2', text: '项目周报', completed: false },
    { id: 'st-3', text: '预约医生', completed: false }
  ]);
  const [addingScheduled, setAddingScheduled] = useState(false);
  const [newScheduled, setNewScheduled] = useState('');

  const [tempTasks, setTempTasks] = useState<TodoItem[]>([
    { id: 'tt-1', text: '缴纳电费', completed: false },
    { id: 'tt-2', text: '归还书籍', completed: false }
  ]);
  const [addingTemp, setAddingTemp] = useState(false);
  const [newTemp, setNewTemp] = useState('');

  const [habits, setHabits] = useState(['每日阅读', '多喝水', '冥想', '早起', '锻炼', '减少糖分', '写日志']);
  const [showAllHabits, setShowAllHabits] = useState(false);

  // Timeline Tasks Flow
  const [selectedHourForPlan, setSelectedHourForPlan] = useState<number | null>(null);
  const [plannedTasks, setPlannedTasks] = useState<{id: string, hour: number, text: string, completed: boolean}[]>([
    { id: 'pt-1', hour: 8, text: '核心代码开发', completed: false },
    { id: 'pt-2', hour: 11, text: '团队同步会议', completed: false },
  ]);
  const [actualTasks, setActualTasks] = useState<{id: string, hour: number, text: string}[]>([
    { id: 'at-1', hour: 8, text: '代码开发 (推迟)' },
    { id: 'at-2', hour: 11, text: '会议 & 问题讨论' },
  ]);

  const handleTaskClickForPlan = (text: string) => {
    if (selectedHourForPlan !== null) {
      setPlannedTasks([...plannedTasks, { id: `pt-${Date.now()}`, hour: selectedHourForPlan, text, completed: false }]);
      setSelectedHourForPlan(null);
    }
  };

  const handleCompleteTask = (text: string, isPlanned: boolean, taskId?: string) => {
    const currentHour = new Date().getHours();
    setActualTasks([...actualTasks, { id: `at-${Date.now()}`, hour: currentHour, text }]);
    
    if (isPlanned && taskId) {
      setPlannedTasks(plannedTasks.map(pt => pt.id === taskId ? { ...pt, completed: true } : pt));
    } else {
      // Toggle completion for scheduled and temp tasks
      if (scheduledTasks.some(t => t.text === text)) {
        setScheduledTasks(scheduledTasks.map(t => t.text === text ? { ...t, completed: !t.completed } : t));
      } else if (tempTasks.some(t => t.text === text)) {
        setTempTasks(tempTasks.map(t => t.text === text ? { ...t, completed: !t.completed } : t));
      } else {
        // Fallback for habits or nested objects if they are still strings
        setScheduledTasks(scheduledTasks.filter(t => t.text !== text));
        setTempTasks(tempTasks.filter(t => t.text !== text));
        setHabits(habits.filter(t => t !== text));
      }
    }
  };

  // Archive flow states
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);
  const [archiveActionable, setArchiveActionable] = useState<boolean | null>(null);
  const [archive2Min, setArchive2Min] = useState<boolean | null>(null);

  // Target task lists (for demonstration of archiving)
  const [weekWaitTasks, setWeekWaitTasks] = useState<string[]>(['确认团队会议议程']);
  const [weekRepeatTasks, setWeekRepeatTasks] = useState<string[]>(['更新博客内容', '每周财务对账']);
  const [weekNextTasks, setWeekNextTasks] = useState<string[]>(['制定下季度市场计划']);
  const [weekTab, setWeekTab] = useState('全部');
  const [weekSelectedDay, setWeekSelectedDay] = useState<number | null>(null);
  const [weekTasksByDay, setWeekTasksByDay] = useState<Record<number, string[]>>({});
  const [monthTab, setMonthTab] = useState('全部');
  const [yearTab, setYearTab] = useState('全部');
  const [somedayTab, setSomedayTab] = useState('全部');
  const [monthTasks, setMonthTasks] = useState<string[]>([]);
  const [yearTasks, setYearTasks] = useState<string[]>([]);
  const [somedayTasks, setSomedayTasks] = useState<string[]>(['探索日本古寺庙', '出版一本技术小说', '深入研究量子计算']);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalType, setGoalType] = useState<'month' | 'year' | 'someday'>('month');
  const [newGoal, setNewGoal] = useState({ name: '', category: '', keyResults: '' });

  // Edit Task Modal States
  const [editingTask, setEditingTask] = useState<{
    id: string;
    text: string;
    type: 'scheduled' | 'temp' | 'habit' | 'planned' | 'inbox' | 'month' | 'year' | 'someday' | 'week_wait' | 'week_repeat' | 'week_next' | 'week_day';
    dayIndex?: number;
    originalIndex?: number;
  } | null>(null);

  const handleUpdateTask = (newText: string) => {
    if (!editingTask) return;
    const { type, id, text, dayIndex, originalIndex } = editingTask;

    if (type === 'scheduled') {
      setScheduledTasks(scheduledTasks.map(t => t.text === text ? { ...t, text: newText } : t));
    } else if (type === 'temp') {
      setTempTasks(tempTasks.map(t => t.text === text ? { ...t, text: newText } : t));
    } else if (type === 'habit') {
      const newHabits = [...habits];
      newHabits[newHabits.indexOf(text)] = newText;
      setHabits(newHabits);
    } else if (type === 'planned') {
      setPlannedTasks(plannedTasks.map(t => t.id === id ? { ...t, text: newText } : t));
    } else if (type === 'inbox') {
      setInboxTasks(inboxTasks.map(t => t.id === id ? { ...t, text: newText } : t));
    } else if (type === 'month') {
      const newTasks = [...monthTasks];
      newTasks[newTasks.indexOf(text)] = newText;
      setMonthTasks(newTasks);
    } else if (type === 'year') {
      const newTasks = [...yearTasks];
      newTasks[newTasks.indexOf(text)] = newText;
      setYearTasks(newTasks);
    } else if (type === 'someday') {
      const newTasks = [...somedayTasks];
      newTasks[newTasks.indexOf(text)] = newText;
      setSomedayTasks(newTasks);
    } else if (type === 'week_wait') {
      const newTasks = [...weekWaitTasks];
      newTasks[newTasks.indexOf(text)] = newText;
      setWeekWaitTasks(newTasks);
    } else if (type === 'week_repeat') {
      const newTasks = [...weekRepeatTasks];
      newTasks[newTasks.indexOf(text)] = newText;
      setWeekRepeatTasks(newTasks);
    } else if (type === 'week_next') {
      const newTasks = [...weekNextTasks];
      newTasks[newTasks.indexOf(text)] = newText;
      setWeekNextTasks(newTasks);
    } else if (type === 'week_day' && dayIndex !== undefined) {
      const dayTasks = [...(weekTasksByDay[dayIndex] || [])];
      dayTasks[dayTasks.indexOf(text)] = newText;
      setWeekTasksByDay({ ...weekTasksByDay, [dayIndex]: dayTasks });
    }

    setEditingTask(null);
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    const { type, id, text, dayIndex } = editingTask;

    if (type === 'scheduled') setScheduledTasks(scheduledTasks.filter(t => t.text !== text));
    else if (type === 'temp') setTempTasks(tempTasks.filter(t => t.text !== text));
    else if (type === 'habit') setHabits(habits.filter(t => t !== text));
    else if (type === 'planned') setPlannedTasks(plannedTasks.filter(t => t.id !== id));
    else if (type === 'inbox') setInboxTasks(inboxTasks.filter(t => t.id !== id));
    else if (type === 'month') setMonthTasks(monthTasks.filter(t => t !== text));
    else if (type === 'year') setYearTasks(yearTasks.filter(t => t !== text));
    else if (type === 'someday') setSomedayTasks(somedayTasks.filter(t => t !== text));
    else if (type === 'week_wait') setWeekWaitTasks(weekWaitTasks.filter(t => t !== text));
    else if (type === 'week_repeat') setWeekRepeatTasks(weekRepeatTasks.filter(t => t !== text));
    else if (type === 'week_next') setWeekNextTasks(weekNextTasks.filter(t => t !== text));
    else if (type === 'week_day' && dayIndex !== undefined) {
      const dayTasks = (weekTasksByDay[dayIndex] || []).filter(t => t !== text);
      setWeekTasksByDay({ ...weekTasksByDay, [dayIndex]: dayTasks });
    }

    setEditingTask(null);
  };

  const handleArchiveTo = (task: {id: string, text: string}, destination: string) => {
    setInboxTasks(inboxTasks.filter(t => t.id !== task.id));
    
    if (destination === 'temp') setTempTasks([...tempTasks, { id: `tt-${Date.now()}`, text: task.text, completed: false }]);
    else if (destination === 'wait') setWeekWaitTasks([...weekWaitTasks, task.text]);
    else if (destination === 'repeat') setWeekRepeatTasks([...weekRepeatTasks, task.text]);
    else if (destination === 'month') setMonthTasks([...monthTasks, task.text]);
    else if (destination === 'year') setYearTasks([...yearTasks, task.text]);
    else if (destination === 'someday') setSomedayTasks([...somedayTasks, task.text]);

    setArchivingTaskId(null);
    setArchiveActionable(null);
    setArchive2Min(null);
  };


  const handleAddInboxTask = () => {
    if (!inboxValue.trim()) return;
    setInboxTasks([{ id: Date.now().toString(), text: inboxValue, createdAt: new Date() }, ...inboxTasks]);
    setInboxValue('');
  };

  const renderToday = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-end mb-5">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 leading-tight">今日</h2>
          <p className="text-gray-500 text-sm font-medium">5月9日 · 星期六</p>
        </div>
        <button className="p-2 rounded-xl hover:bg-white/50 transition-colors">
          <Settings className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      {/* Timeline Header (Moved outside scroll area) */}
      <div className="flex ml-[calc(3.5rem+6px)] mb-2 bg-white/50 backdrop-blur-md z-20 py-1.5 rounded-xl px-4 border border-white/40 shadow-sm mx-2">
        <span className="flex-1 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">计划</span>
        <span className="flex-1 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest border-l border-gray-100">实际</span>
      </div>

      {/* Timeline Section */}
      <section className="relative -mx-2 px-2 overflow-y-auto max-h-[400px] no-scrollbar border-t border-gray-100/50 bg-white/30 rounded-t-xl">
        <div className="space-y-0 pt-2">
          {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((hour) => {
            const isSelected = selectedHourForPlan === hour;
            const hourTasks = plannedTasks.filter(pt => pt.hour === hour);
            const displayHour = hour < 10 ? `0${hour}` : hour;

            return (
              <div key={hour} className="flex group relative min-h-[48px]">
                {/* Time column (Now clickable) */}
                <div 
                  className={`w-[3.5rem] pr-2 text-right pt-2 border-r border-gray-100/50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/20' : 'hover:bg-gray-50/50'}`}
                  onClick={() => setSelectedHourForPlan(isSelected ? null : hour)}
                >
                  <span className={`text-[11px] font-bold transition-all duration-200 ${isSelected ? 'text-blue-600 scale-110 inline-block' : 'text-gray-300 group-hover:text-gray-500'}`}>
                    {displayHour}:00
                  </span>
                </div>
                
                {/* Plan column */}
                <div 
                  className={`flex-1 relative cursor-pointer transition-all duration-200 border-b border-gray-50 flex flex-col p-1 gap-1
                    ${isSelected ? 'bg-blue-50/40 ring-1 ring-inset ring-blue-100/30 z-10' : 'hover:bg-gray-50/30'}
                  `}
                  onClick={() => setSelectedHourForPlan(selectedHourForPlan === hour ? null : hour)}
                >
                  {hourTasks.map(pt => (
                    <PressableItem 
                      key={pt.id} 
                      onLongPress={() => setEditingTask({ id: pt.id, text: pt.text, type: 'planned' })}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-full bg-white/80 backdrop-blur-md border border-gray-100/80 rounded-lg p-2 items-center flex shadow-sm transition-all group ${pt.completed ? 'opacity-40 grayscale' : 'hover:scale-[1.01] hover:shadow-md'}`}
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
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-[#4a5d7e]/40 hover:text-green-500 transition-colors" />
                        )}
                      </button>
                      <span className={`text-[11px] font-bold text-[#4a5d7e] leading-tight ${pt.completed ? 'line-through text-gray-400' : ''}`}>
                        {pt.text}
                      </span>
                    </PressableItem>
                  ))}
                  {isSelected && hourTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center min-h-[30px]">
                      <Plus className="w-4 h-4 text-blue-300 animate-pulse" />
                    </div>
                  )}
                </div>
                
                {/* Actual column */}
                <div className="flex-1 border-l border-dashed border-gray-100 border-b border-gray-50 p-1 flex flex-col gap-1">
                  {actualTasks.filter(at => at.hour === hour).map((at, idx) => (
                    <div 
                      key={at.id || idx} 
                      className="w-full bg-[#b5838d]/10 backdrop-blur-md border border-[#b5838d]/20 rounded-lg p-2 flex items-center shadow-sm"
                    >
                      <span className="text-[11px] font-bold text-[#6d4c51] truncate leading-tight">{at.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Large bottom spacer to allow scrolling past the pinned blocks */}
        <div className="h-[400px]"></div>
      </section>

      {/* Bottom Area: Categories Grid + Inbox Input */}
      <div className="fixed bottom-24 left-0 right-0 z-40 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pointer-events-auto">
          {/* Categories Grid (Horizontal Scroll) */}
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4">
            <section className="acrylic bg-[#92a8d1]/15 backdrop-blur-md rounded-lg p-3 flex flex-col gap-2 aspect-square border-[#92a8d1]/20 shadow-sm overflow-hidden w-[38vw] shrink-0 sm:w-[240px] snap-center">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-[#4a5d7e] text-[11px]">安排任务</h3>
                <button onClick={() => setAddingScheduled(true)}><PlusCircle className="w-3.5 h-3.5 text-[#4a5d7e]/60 hover:text-[#4a5d7e] transition-colors" /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-1">
                {[...scheduledTasks, ...((weekTasksByDay[1] || []).map((t, i) => ({ id: `ws-${i}`, text: t, completed: false })))].sort((a, b) => Number(a.completed) - Number(b.completed)).map((t, idx) => (
                  <PressableItem 
                    key={t.id} 
                    onLongPress={() => setEditingTask({ id: t.id, text: t.text, type: 'scheduled' })}
                    className={`flex items-center gap-2 cursor-pointer group ${t.completed ? 'opacity-50' : ''}`}
                    onClick={() => handleTaskClickForPlan(t.text)}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCompleteTask(t.text, false); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      {t.completed ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-[#4a5d7e]/30 group-hover:text-green-500 transition-colors flex-shrink-0" />
                      )}
                    </button>
                    <span className={`text-[10px] font-medium text-[#4a5d7e] leading-tight ${t.completed ? 'line-through text-gray-400' : ''}`}>{t.text}</span>
                  </PressableItem>
                ))}
                {addingScheduled && (
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-[#4a5d7e]/30 flex-shrink-0" />
                    <input 
                      autoFocus
                      className="bg-transparent border-b border-[#4a5d7e]/30 focus:border-[#4a5d7e] outline-none text-[10px] font-medium text-[#4a5d7e] w-full pb-0.5"
                      value={newScheduled}
                      onChange={e => setNewScheduled(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newScheduled.trim()) {
                          setScheduledTasks([...scheduledTasks, { id: `st-${Date.now()}`, text: newScheduled.trim(), completed: false }]);
                          setNewScheduled('');
                          setAddingScheduled(false);
                        } else if (e.key === 'Escape') {
                          setAddingScheduled(false);
                          setNewScheduled('');
                        }
                      }}
                      onBlur={() => {
                        if (newScheduled.trim()) {
                          setScheduledTasks([...scheduledTasks, { id: `st-${Date.now()}`, text: newScheduled.trim(), completed: false }]);
                        }
                        setNewScheduled('');
                        setAddingScheduled(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="acrylic bg-[#a3b18a]/15 backdrop-blur-md rounded-lg p-3 flex flex-col gap-2 aspect-square border-[#a3b18a]/20 shadow-sm overflow-hidden w-[38vw] shrink-0 sm:w-[240px] snap-center">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-[#4f5b3a] text-[11px]">临时待办</h3>
                <button onClick={() => setAddingTemp(true)}><PlusCircle className="w-3.5 h-3.5 text-[#4f5b3a]/60 hover:text-[#4f5b3a] transition-colors" /></button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-1">
                {tempTasks.slice().sort((a, b) => Number(a.completed) - Number(b.completed)).map((t) => (
                  <PressableItem 
                    key={t.id} 
                    onLongPress={() => setEditingTask({ id: t.id, text: t.text, type: 'temp' })}
                    className={`flex items-center gap-2 cursor-pointer group ${t.completed ? 'opacity-50' : ''}`}
                    onClick={() => handleTaskClickForPlan(t.text)}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCompleteTask(t.text, false); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      {t.completed ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-[#4f5b3a]/30 group-hover:text-green-500 transition-colors flex-shrink-0" />
                      )}
                    </button>
                    <span className={`text-[10px] font-medium text-[#4f5b3a] leading-tight ${t.completed ? 'line-through text-gray-400' : ''}`}>{t.text}</span>
                  </PressableItem>
                ))}
                {addingTemp && (
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-[#4f5b3a]/30 flex-shrink-0" />
                    <input 
                      autoFocus
                      className="bg-transparent border-b border-[#4f5b3a]/30 focus:border-[#4f5b3a] outline-none text-[10px] font-medium text-[#4f5b3a] w-full pb-0.5"
                      value={newTemp}
                      onChange={e => setNewTemp(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newTemp.trim()) {
                          setTempTasks([...tempTasks, { id: `tt-${Date.now()}`, text: newTemp.trim(), completed: false }]);
                          setNewTemp('');
                          setAddingTemp(false);
                        } else if (e.key === 'Escape') {
                          setAddingTemp(false);
                          setNewTemp('');
                        }
                      }}
                      onBlur={() => {
                        if (newTemp.trim()) {
                          setTempTasks([...tempTasks, { id: `tt-${Date.now()}`, text: newTemp.trim(), completed: false }]);
                        }
                        setNewTemp('');
                        setAddingTemp(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="acrylic bg-[#b5838d]/15 backdrop-blur-md rounded-lg p-3 flex flex-col gap-2 aspect-square border-[#b5838d]/20 shadow-sm overflow-hidden w-[38vw] shrink-0 sm:w-[240px] snap-center">
              <div className="flex justify-between items-center flex-shrink-0">
                <h3 className="font-bold text-[#6d4c51] text-[11px]">习惯</h3>
                <button 
                  onClick={() => setShowAllHabits(!showAllHabits)}
                  className="text-[9px] font-black uppercase text-[#b5838d] px-1.5 py-0.5 bg-white/40 hover:bg-white/60 transition-colors rounded-md"
                >
                  {showAllHabits ? '收起' : '全部'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2 pb-1">
                {(showAllHabits ? habits : habits.slice(0, 5)).map((t, idx) => (
                  <PressableItem 
                    key={t} 
                    onLongPress={() => setEditingTask({ id: `h-${idx}`, text: t, type: 'habit' })}
                    className="flex items-center gap-2 p-1.5 bg-white/30 rounded-md border border-white/40 cursor-pointer group"
                    onClick={() => handleTaskClickForPlan(t)}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCompleteTask(t, false); }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <Circle className="w-3 h-3 text-[#b5838d]/60 group-hover:text-green-500 transition-colors" />
                    </button>
                    <span className="text-[10px] font-medium text-[#6d4c51] truncate">{t}</span>
                  </PressableItem>
                ))}
              </div>
            </section>
          </div>

          {/* Inbox Input */}
          <div className="acrylic bg-white/70 backdrop-blur-xl rounded-xl shadow-2xl flex items-center p-1.5 border border-white/60">
            <button 
              onClick={() => setActiveTab('inbox')}
              className="p-3 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg text-blue-600 transition-colors"
            >
              <Inbox className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              placeholder="添加到收集箱..." 
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 text-gray-700 placeholder:text-gray-400 font-bold text-sm"
              value={inboxValue}
              onChange={(e) => setInboxValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddInboxTask();
                }
              }}
            />
            <button 
              onClick={handleAddInboxTask}
              className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderWeek = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
            <img src="https://ui-avatars.com/api/?name=User&background=random" alt="user" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">本周</h2>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-0.5 text-gray-500">
             <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
             <span className="text-xs font-bold w-10 text-center">第18周</span>
             <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
           </div>
           <button className="p-1.5 rounded-xl hover:bg-gray-100"><Settings className="w-5 h-5 text-blue-600" /></button>
        </div>
      </header>

      {/* Date Selector */}
      <div className="border-b border-gray-100 pb-6">
        <div className="flex items-start overflow-x-auto snap-x snap-mandatory gap-1 -mx-4 px-4 no-scrollbar">
          {[
            { day: '一', date: 4, index: 0, isToday: false },
            { day: '二', date: 5, index: 1, isToday: true },
            { day: '三', date: 6, index: 2, isToday: false },
            { day: '四', date: 7, index: 3, isToday: false },
            { day: '五', date: 8, index: 4, isToday: false },
            { day: '六', date: 9, index: 5, isToday: false },
            { day: '日', date: 10, index: 6, isToday: false },
          ].map((item) => {
            const isSelected = weekSelectedDay === item.index;
            const dayTasks = weekTasksByDay[item.index] || [];
            
            return (
              <div 
                key={item.index} 
                className="flex-none w-[100px] snap-center flex flex-col items-center px-1 py-1 cursor-pointer transition-all"
                onClick={() => setWeekSelectedDay(isSelected ? null : item.index)}
              >
                <div className="flex flex-col items-center mb-3">
                  <span className={`text-[11px] font-bold mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                    {item.day}
                  </span>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                      isSelected 
                        ? 'text-white bg-[#0b5cbf] font-bold shadow-sm' 
                        : item.isToday ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-900 hover:bg-gray-100'
                    }`}>
                    {item.date}
                  </div>
                </div>

                <div className="w-full flex flex-col gap-1">
                  {dayTasks.map((task, idx) => {
                    const hasPrev = item.index > 0 && (weekTasksByDay[item.index - 1] || []).some(t => t === task);
                    const hasNext = item.index < 6 && (weekTasksByDay[item.index + 1] || []).some(t => t === task);
                    
                    return (
                      <PressableItem 
                        key={idx} 
                        onLongPress={() => setEditingTask({ id: `wd-${idx}`, text: task, type: 'week_day', dayIndex: item.index })}
                        className={`bg-white p-1.5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center relative group min-h-[40px] transition-all
                          ${hasPrev ? 'rounded-l-none border-l-0 -ml-[5px] pl-[6.5px]' : 'rounded-l-lg'}
                          ${hasNext ? 'rounded-r-none border-r-0 -mr-[5px] pr-[6.5px]' : 'rounded-r-lg'}
                        `}
                      >
                        <span className="text-[9px] font-bold text-gray-700 leading-tight line-clamp-2">{task}</span>
                        <button 
                           className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                           onClick={(e) => {
                             e.stopPropagation();
                             const newTasks = [...dayTasks];
                             newTasks.splice(idx, 1);
                             setWeekTasksByDay({
                               ...weekTasksByDay,
                               [item.index]: newTasks
                             });
                             setWeekWaitTasks([...weekWaitTasks, task]);
                           }}
                           onMouseDown={(e) => e.stopPropagation()}
                           onTouchStart={(e) => e.stopPropagation()}
                        >
                           <X className="w-2.5 h-2.5" />
                        </button>
                      </PressableItem>
                    );
                  })}
                  {isSelected && dayTasks.length === 0 && (
                    <div className="text-[9px] text-gray-400 font-medium text-center py-3 px-1 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">点击下方安排</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {/* Category Tabs */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar items-center pb-2">
          {['全部', '等待', '下一步', '重复事项'].map((tag) => (
            <button 
              key={tag} 
              onClick={() => setWeekTab(tag)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${weekTab === tag ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-3 mb-8">
          {(weekTab === '全部' ? [...weekWaitTasks, ...weekNextTasks, ...weekRepeatTasks] 
            : weekTab === '等待' ? weekWaitTasks 
            : weekTab === '下一步' ? weekNextTasks 
            : weekRepeatTasks).length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm font-medium">没有找到相应的任务</div>
            ) : (
            (weekTab === '全部' ? [...weekWaitTasks, ...weekNextTasks, ...weekRepeatTasks] 
              : weekTab === '等待' ? weekWaitTasks 
              : weekTab === '下一步' ? weekNextTasks 
              : weekRepeatTasks).map((t, i) => {
              const type = weekWaitTasks.includes(t) ? 'week_wait' : weekNextTasks.includes(t) ? 'week_next' : 'week_repeat';
              return (
                <PressableItem 
                  key={i} 
                  onLongPress={() => setEditingTask({ id: `w-${i}`, text: t, type })}
                  onClick={() => {
                    if (weekSelectedDay !== null) {
                      // Move task to selected day
                      const newDayTasks = [...(weekTasksByDay[weekSelectedDay] || []), t];
                      setWeekTasksByDay({
                        ...weekTasksByDay,
                        [weekSelectedDay]: newDayTasks
                      });
                      
                      // Remove from source list
                      if (weekWaitTasks.includes(t)) {
                        setWeekWaitTasks(weekWaitTasks.filter(task => task !== t));
                      } else if (weekNextTasks.includes(t)) {
                        setWeekNextTasks(weekNextTasks.filter(task => task !== t));
                      } else if (weekRepeatTasks.includes(t)) {
                        setWeekRepeatTasks(weekRepeatTasks.filter(task => task !== t));
                      }
                    }
                  }}
                  className={`flex items-center gap-4 py-2 transition-all ${weekSelectedDay !== null ? 'cursor-pointer hover:opacity-70' : ''}`}
                >
                  <div className="w-5 h-5 border-2 border-gray-400 rounded-sm flex-shrink-0"></div>
                  <span className="text-sm font-medium text-gray-700">{t}</span>
                </PressableItem>
              );
            })
          )}
        </div>

        {/* Review Card from reference */}
        <div className="bg-[#fcf6f1] border border-[#f0e2d5] rounded-[14px] p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#a66232]">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5 3 7 3 11h10c0-4 3-6 3-11a8 8 0 0 0-8-8z"/>
              <path d="M9 22h6"/>
              <path d="M9 12a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"/>
            </svg>
            <h3 className="font-bold text-lg">上次复盘于 X 天前</h3>
          </div>
          <p className="text-sm text-[#a66232]/80 font-medium leading-relaxed">
            回顾本周成就，反思待改进之处，为下周做好规划。
          </p>
          <button 
            onClick={() => setIsReviewOpen(true)}
            className="mt-2 w-full py-3 bg-[#9b5110] text-[#fcf6f1] rounded-xl font-bold hover:bg-[#80420c] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>开始复盘</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderMonth = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4"
    >
      <header className="flex justify-between items-center mb-5">
        <h2 className="text-3xl font-bold text-gray-900">5月</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setGoalType('month'); setIsGoalModalOpen(true); }}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-bold">本月</button>
          <button className="p-2 rounded-lg hover:bg-gray-100"><LayoutGrid className="w-5 h-5 text-gray-400" /></button>
        </div>
      </header>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar items-center pb-2">
        {['全部', '工作', '个人', '健康'].map((tag) => (
          <button 
            key={tag} 
            onClick={() => setMonthTab(tag)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${monthTab === tag ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        <div className="acrylic p-4 rounded-xl">
          <h3 className="text-lg font-bold mb-2">短期项目</h3>
          <p className="text-sm text-gray-500">本月重点推进具有较高影响力的中短期任务。</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {[
            { name: '个人品牌视觉迭代', progress: 65, date: '5月24日', color: 'blue', category: '工作' },
            { name: '季度市场调研报告', progress: 15, date: '5月31日', color: 'orange', category: '工作' },
            { name: '智能家居自动化系统', progress: 90, date: '5月15日', color: 'green', category: '个人' },
          ].filter(p => monthTab === '全部' || p.category === monthTab).map(p => (
            <div key={p.name} className="fluent-card p-4 group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">{p.name}</h4>
                  <span className="text-xs text-gray-400">截止日期: {p.date}</span>
                </div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded bg-${p.color}-50 text-${p.color}-600`}>
                  {p.progress === 90 ? '即将完成' : '进行中'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-gray-400">项目进度</span>
                  <span className={p.progress > 50 ? 'text-blue-600' : 'text-orange-600'}>{p.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${p.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full bg-${p.color}-600 rounded-full`}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Render archived monthTasks */}
          {monthTasks.length > 0 && monthTab === '全部' && (
            <div className="space-y-3 mt-4">
              <h3 className="font-bold text-gray-800 px-2 text-sm">其他任务</h3>
              {monthTasks.map((task, idx) => (
                <PressableItem 
                  key={idx} 
                  onLongPress={() => setEditingTask({ id: `m-${idx}`, text: task, type: 'month' })}
                  className="fluent-card bg-white/80 p-3 rounded-xl cursor-pointer border border-white flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-[4px] border-2 border-gray-400/80 flex-shrink-0 cursor-pointer"></div>
                  <span className="text-sm font-medium text-gray-700">{task}</span>
                </PressableItem>
              ))}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );

  const renderYear = () => (
    <motion.div 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 20 }}
      className="space-y-4"
    >
      <header className="flex justify-between items-center mb-5">
        <h2 className="text-3xl font-bold text-gray-900">2026年</h2>
        <button 
          onClick={() => { setGoalType('year'); setIsGoalModalOpen(true); }}
          className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar items-center pb-2">
        {['全部', 'Vision', 'Career', 'Health', 'Finance'].map((tag) => (
          <button 
            key={tag} 
            onClick={() => setYearTab(tag)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${yearTab === tag ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        {(yearTab === '全部' || yearTab === 'Career') && (
          <div className="bg-gray-900 text-white p-5 rounded-xl shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">年度核心目标</span>
              </div>
              <h3 className="text-xl font-bold mb-2">掌握高级后端架构设计</h3>
              <p className="text-gray-400 text-sm max-w-xs mb-4">并在 10 月前获得云原生专家级别认证。</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-2/3 rounded-full"></div>
                </div>
                <span className="text-xs font-bold">65%</span>
              </div>
            </div>
            {/* Abstract circle decoration */}
            <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors"></div>
          </div>
        )}

        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 px-2 text-sm">长期项目</h3>
          <div className="grid grid-cols-1 gap-2">
            {[
              { q: 'Q1', title: '核心技术选型与原型验证', completed: true, category: 'Career' },
              { q: 'Q2', title: '分布式系统核心模块开发', completed: false, category: 'Career' },
              { q: 'Q3', title: '性能测试与弹性扩展优化', completed: false, category: 'Career' },
              { q: 'Q4', title: '专家级认证考试与技术总结', completed: false, category: 'Career' },
            ].filter(item => yearTab === '全部' || item.category === yearTab).map(item => (
              <div key={item.title} className="p-3 rounded-xl border border-gray-100 flex items-center gap-3 hover:bg-white hover:shadow-xl hover:shadow-gray-100 group transition-all">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${item.completed ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                  {item.q}
                </div>
                <span className={`text-sm font-medium ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.title}</span>
                {item.completed && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
              </div>
            ))}
          </div>
          
          {yearTasks.length > 0 && yearTab === '全部' && (
            <div className="space-y-3 mt-4">
              <h3 className="font-bold text-gray-800 px-2 text-sm">其他长期项目</h3>
              {yearTasks.map((task, idx) => (
                <PressableItem 
                  key={idx} 
                  onLongPress={() => setEditingTask({ id: `y-${idx}`, text: task, type: 'year' })}
                  className="fluent-card bg-white/80 p-3 rounded-xl cursor-pointer border border-white flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-[4px] border-2 border-gray-400/80 flex-shrink-0 cursor-pointer"></div>
                  <span className="text-sm font-medium text-gray-700">{task}</span>
                </PressableItem>
              ))}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );

  const renderSomeday = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 1.05 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4 pb-20"
    >
      <header className="flex justify-between items-center mb-5">
        <h2 className="text-3xl font-bold text-gray-900">将来</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setGoalType('someday'); setIsGoalModalOpen(true); }}
            className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-xl hover:bg-white/50 transition-colors">
            <Search className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 rounded-xl hover:bg-white/50 transition-colors">
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar items-center pb-2">
        {['全部', '心愿单', '技能', '创意', '旅行', '健康', '财务'].map((tag) => (
          <button 
            key={tag} 
            onClick={() => setSomedayTab(tag)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${somedayTab === tag ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-100'}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        {(somedayTab === '全部' || somedayTab === '心愿单') && (
          <div className="acrylic p-4 rounded-xl group cursor-pointer border-blue-100/50">
            <div className="flex items-center gap-3 mb-3 text-blue-600">
              <Compass className="w-6 h-6" />
              <h3 className="text-xl font-bold">将来目标</h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
              存放那些尚未确定日期的梦想。记录每一个‘如果’和‘将来某天’。
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: <Compass className="w-4 h-4" />, category: '旅行', title: '探索日本古寺庙', desc: '在樱花季深度游历京都，体验禅宗生活。', progress: 0 },
            { icon: <Rocket className="w-4 h-4" />, category: '创意', title: '出版一本技术小说', desc: '将分布式系统的复杂理论融入科幻叙事。', progress: 0 },
            { icon: <TrendingUp className="w-4 h-4" />, category: '技能', title: '深入研究量子计算', desc: '掌握量子算法基础并进行初步实验项目。', progress: 15 },
          ].filter(item => somedayTab === '全部' || item.category === somedayTab).map(item => (
            <div key={item.title} className="fluent-card p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="p-2 bg-blue-50 rounded-lg">{item.icon}</div>
                    <span className="text-[10px] font-black uppercase text-gray-400">{item.category}</span>
                  </div>
                  <span className="text-[10px] font-black text-blue-300">#SOMEDAY</span>
                </div>
                <h4 className="font-bold text-gray-800 mb-2">{item.title}</h4>
                <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
              {item.progress > 0 && (
                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] font-black">
                    <span className="text-gray-400 uppercase">当前探索进度</span>
                    <span className="text-blue-600">{item.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.progress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {somedayTasks.filter(task => !['探索日本古寺庙', '出版一本技术小说', '深入研究量子计算'].includes(task)).length > 0 && somedayTab === '全部' && (
            <div className="col-span-full space-y-3 mt-2">
              <h3 className="font-bold text-gray-800 px-2 text-sm">其他想法</h3>
              {somedayTasks.filter(task => !['探索日本古寺庙', '出版一本技术小说', '深入研究量子计算'].includes(task)).map((task, idx) => (
                <PressableItem 
                  key={idx} 
                  onLongPress={() => setEditingTask({ id: `sd-${idx}`, text: task, type: 'someday' })}
                  className="fluent-card bg-white/80 p-3 rounded-xl cursor-pointer border border-white flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-[4px] border-2 border-gray-400/80 flex-shrink-0 cursor-pointer"></div>
                  <span className="text-sm font-medium text-gray-700">{task}</span>
                </PressableItem>
              ))}
            </div>
          )}
        </div>
      </section>
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
        <button onClick={() => setActiveTab('today')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
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
          inboxTasks.map(task => (
            <PressableItem 
              key={task.id} 
              onLongPress={() => setEditingTask({ id: task.id, text: task.text, type: 'inbox' })}
              className="fluent-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 cursor-pointer hover:border-blue-500 transition-colors"></div>
                  <span className="text-sm font-medium text-gray-700">{task.text}</span>
                </div>
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
                  className="text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {archivingTaskId === task.id ? '取消' : '归档'}
                </button>
              </div>
              
              {archivingTaskId === task.id && (
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/60 flex flex-col gap-4 mt-2">
                  {/* 第一行: 能否行动 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">能否行动？</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setArchiveActionable(true); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${archiveActionable === true ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                      >是</button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setArchiveActionable(false); }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${archiveActionable === false ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                      >否</button>
                    </div>
                  </div>

                  {/* 选否: 有时间/无时间 */}
                  {archiveActionable === false && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleArchiveTo(task, 'wait'); }}
                         className="flex-1 px-2 py-2 bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                      >
                        <span>有时间</span>
                        <span className="text-[10px] font-normal text-gray-400">周页等待分类</span>
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleArchiveTo(task, 'someday'); }}
                         className="flex-1 px-2 py-2 bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                      >
                        <span>无时间</span>
                        <span className="text-[10px] font-normal text-gray-400">归档到将来页</span>
                      </button>
                    </div>
                  )}

                  {/* 选是: 能否2分钟完成 */}
                  {archiveActionable === true && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <span className="text-sm font-bold text-gray-700 truncate mr-2">能否2分钟完成？</span>
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleArchiveTo(task, 'temp'); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-gray-600 border border-gray-200 hover:bg-blue-50 transition-colors"
                        >是 (加到今日)</button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setArchive2Min(false); }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${archive2Min === false ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                        >否</button>
                      </div>
                    </div>
                  )}

                  {/* 能否2分钟完成选否: 下一步 */}
                  {archiveActionable === true && archive2Min === false && (
                    <div className="pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                      <span className="text-sm font-bold text-gray-700 block mb-3">下一步：</span>
                      <div className="flex gap-2">
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleArchiveTo(task, 'repeat'); }}
                           className="flex-1 px-1 py-2 bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                        ><span>固定周期</span><span className="text-[9px] font-normal text-gray-400">周页重复</span></button>
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleArchiveTo(task, 'month'); }}
                           className="flex-1 px-1 py-2 bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                        ><span>短期</span><span className="text-[9px] font-normal text-gray-400">归档到月</span></button>
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleArchiveTo(task, 'year'); }}
                           className="flex-1 px-1 py-2 bg-white hover:bg-blue-50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition-colors flex flex-col items-center gap-1"
                        ><span>长期</span><span className="text-[9px] font-normal text-gray-400">归档到年</span></button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </PressableItem>
          ))
        )}
      </div>
    </motion.div>
  );

  const renderNewTaskModal = () => (
    <AnimatePresence>
      {isNewTaskModalOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNewTaskModalOpen(false)}
            className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#f8f9fa] rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-200/60 bg-white rounded-t-3xl">
              {newTaskStep === 1 ? (
                <div className="w-8" />
              ) : (
                <button onClick={() => setNewTaskStep(1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft className="w-6 h-6 text-gray-500" />
                </button>
              )}
              <h3 className="font-bold text-lg text-gray-900">
                {newTaskStep === 1 ? '新增任务' : '更多设置'}
              </h3>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {newTaskStep === 1 ? (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">任务名称</label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="想做什么？" 
                      value={newTaskData.name}
                      onChange={e => setNewTaskData({...newTaskData, name: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><Tag className="w-4 h-4 text-blue-500" />分类</label>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {['工作', '个人', '健康', '家庭', '财务', '学习'].map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setNewTaskData({...newTaskData, category: cat})}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${newTaskData.category === cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-gray-400" />备注</label>
                    <textarea 
                      placeholder="添加一些细节..." 
                      value={newTaskData.notes}
                      onChange={e => setNewTaskData({...newTaskData, notes: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all min-h-[100px] shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><ListTodo className="w-4 h-4 text-blue-400" />子任务</label>
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      {newTaskData.subtasks.map((st, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          <span className="text-sm text-gray-700 font-medium">{st}</span>
                          <button 
                            onClick={() => setNewTaskData({...newTaskData, subtasks: newTaskData.subtasks.filter((_, idx) => idx !== i)})}
                            className="ml-auto text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-3">
                        <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        <input 
                          type="text" 
                          placeholder="添加子任务..." 
                          className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-400"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              setNewTaskData({...newTaskData, subtasks: [...newTaskData.subtasks, e.currentTarget.value.trim()]});
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 block">任务类型</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['临时待办', '重复事项', '安排任务'].map(type => (
                        <button 
                          key={type}
                          onClick={() => setNewTaskData({...newTaskData, type})}
                          className={`py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex flex-col items-center justify-center gap-1 ${newTaskData.type === type ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {type === '临时待办' && <Clock className={`w-5 h-5 ${newTaskData.type === type ? 'text-white' : 'text-gray-400'}`} />}
                          {type === '重复事项' && <Repeat className={`w-5 h-5 ${newTaskData.type === type ? 'text-white' : 'text-gray-400'}`} />}
                          {type === '安排任务' && <CalendarDays className={`w-5 h-5 ${newTaskData.type === type ? 'text-white' : 'text-gray-400'}`} />}
                          <span className="mt-1">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {newTaskData.type === '重复事项' && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><Target className="w-4 h-4 text-green-500" />目标次数 (每周)</label>
                      <input 
                        type="number" 
                        min="1"
                        max="7"
                        value={newTaskData.targetCount}
                        onChange={e => setNewTaskData({...newTaskData, targetCount: parseInt(e.target.value) || 1})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><Flag className="w-4 h-4 text-red-400" />截止日期</label>
                    <input 
                      type="date" 
                      value={newTaskData.dueDate}
                      onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-indigo-500" />关联关键结果 (KR)</label>
                    <select 
                      value={newTaskData.linkedKR}
                      onChange={e => setNewTaskData({...newTaskData, linkedKR: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all appearance-none shadow-sm"
                    >
                      <option value="">选择关联的目标或KR...</option>
                      <option value="kr-1">掌握高级后端架构设计 (年)</option>
                      <option value="kr-2">个人品牌视觉迭代 (月)</option>
                      <option value="kr-3">季前市场调研报告 (月)</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="p-5 bg-white border-t border-gray-100 flex gap-3 pb-safe items-center">
              {newTaskStep === 1 ? (
                <>
                  <button 
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="px-6 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    disabled={!newTaskData.name.trim()}
                    onClick={() => setNewTaskStep(2)}
                    className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    下一步 <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => {
                        if (newTaskData.name.trim()) {
                            setIsNewTaskModalOpen(false);
                            setNewTaskData({
                                name: '',
                                category: '',
                                notes: '',
                                subtasks: [] as string[],
                                type: '临时待办',
                                targetCount: 1,
                                dueDate: '',
                                linkedKR: ''
                            });
                        }
                    }}
                    className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                  >
                    保存并添加
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const renderEditTaskModal = () => (
    <AnimatePresence>
      {editingTask && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-5">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingTask(null)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 line-clamp-1">编辑任务</h3>
              <button 
                onClick={() => setEditingTask(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">任务名称</label>
                <textarea 
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
                  rows={3}
                  value={editingTask.text}
                  onChange={e => setEditingTask({ ...editingTask, text: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleUpdateTask(editingTask.text)}
                  className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
                >
                  保存修改
                </button>
                <button 
                  onClick={handleDeleteTask}
                  className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                >
                  删除任务
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderNewGoalModal = () => (
    <AnimatePresence>
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-5">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsGoalModalOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                新增{goalType === 'month' ? '月' : goalType === 'year' ? '年' : '将来'}目标
              </h3>
              <button 
                onClick={() => setIsGoalModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">目标名称</label>
                <input 
                  type="text"
                  placeholder="你想实现什么？"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  value={newGoal.name}
                  onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">分类</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['工作', '个人', '健康', '财务', '学习'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setNewGoal({ ...newGoal, category: cat })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        newGoal.category === cat 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">关键结果 (Key Results)</label>
                <textarea 
                  placeholder="如何衡量成功？(例如：完成3个原型设计)"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
                  value={newGoal.keyResults}
                  onChange={e => setNewGoal({ ...newGoal, keyResults: e.target.value })}
                />
              </div>

              <button 
                onClick={() => {
                  if (!newGoal.name) return;
                  if (goalType === 'month') setMonthTasks([...monthTasks, newGoal.name]);
                  else if (goalType === 'year') setYearTasks([...yearTasks, newGoal.name]);
                  else setSomedayTasks([...somedayTasks, newGoal.name]);
                  
                  setNewGoal({ name: '', category: '', keyResults: '' });
                  setIsGoalModalOpen(false);
                }}
                className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl shadow-gray-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                创建目标 <Target className="w-5 h-5 text-blue-400" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderReviewModal = () => (
    <AnimatePresence>
      {isReviewOpen && (
        <motion.div
           initial={{ opacity: 0, y: '100%' }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: '100%' }}
           transition={{ type: 'spring', damping: 25, stiffness: 200 }}
           className="fixed inset-0 z-[100] bg-[#fcf8f5] flex flex-col pt-10 px-0 pb-0"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6 px-5 relative shrink-0">
            <h2 className="text-2xl font-black text-[#a66232]">周复盘</h2>
            <button 
              onClick={() => setIsReviewOpen(false)}
              className="p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
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
                   <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">1</div>
                   <h3 className="font-bold text-gray-800 text-[15px]">检查项目</h3>
                 </div>
                 <p className="text-gray-500 text-xs ml-10 leading-relaxed">每个项目至少有1条下一步动作。</p>
               </div>

               <div className="bg-white p-5 rounded-[16px] shadow-sm border border-blue-100 flex flex-col gap-1">
                 <div className="flex items-center gap-3 mb-1">
                   <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
                   <h3 className="font-bold text-gray-800 text-[15px]">检查等待</h3>
                 </div>
                 <p className="text-gray-500 text-xs ml-10 leading-relaxed">都有日期，该催的催，该放弃的删。</p>
               </div>

               <div className="bg-white p-5 rounded-[16px] shadow-sm border border-green-100 flex flex-col gap-1">
                 <div className="flex items-center gap-3 mb-1">
                   <div className="w-7 h-7 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">3</div>
                   <h3 className="font-bold text-gray-800 text-[15px]">检查重复事项</h3>
                 </div>
                 <p className="text-gray-500 text-xs ml-10 leading-relaxed">这周哪些例行要调整。</p>
               </div>

               <div className="bg-white p-5 rounded-[16px] shadow-sm border border-purple-100 flex flex-col gap-1">
                 <div className="flex items-center gap-3 mb-1">
                   <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">4</div>
                   <h3 className="font-bold text-gray-800 text-[15px]">清理将来</h3>
                 </div>
                 <p className="text-gray-500 text-xs ml-10 leading-relaxed">删掉一半也正常。</p>
               </div>

               <div className="bg-white p-5 rounded-[16px] shadow-sm border border-red-100 flex flex-col gap-1">
                 <div className="flex items-center gap-3 mb-1">
                   <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">5</div>
                   <h3 className="font-bold text-gray-800 text-[15px]">计划下周</h3>
                 </div>
                 <p className="text-gray-500 text-xs ml-10 leading-relaxed">挑3-5个重点推进的项目。</p>
               </div>
             </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-5 pt-8 bg-gradient-to-t from-[#fcf8f5] via-[#fcf8f5] to-transparent shrink-0">
             <button 
               onClick={() => setIsReviewOpen(false)}
               className="w-full py-4 bg-[#9b5110] text-[#fcf6f1] font-bold rounded-2xl shadow-lg shadow-[#9b5110]/20 active:scale-95 transition-transform flex justify-center items-center gap-2"
             >
               完成复盘 <CheckCircle2 className="w-5 h-5" />
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-fluent-bg font-sans overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Background Decorative Blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      <main className="max-w-screen-xl mx-auto px-4 pt-6 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && renderToday()}
          {activeTab === 'week' && renderWeek()}
          {activeTab === 'month' && renderMonth()}
          {activeTab === 'year' && renderYear()}
          {activeTab === 'someday' && renderSomeday()}
          {activeTab === 'inbox' && renderInbox()}
        </AnimatePresence>
      </main>

      {renderNewTaskModal()}
      {renderReviewModal()}
      {renderNewGoalModal()}
      {renderEditTaskModal()}

      {/* Floating Plus Button (except Today) */}
      {activeTab !== 'today' && (
        <motion.button 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          onClick={() => {
            setIsNewTaskModalOpen(true);
            setNewTaskStep(1);
          }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-200 flex items-center justify-center hover:bg-blue-700 transition-colors z-50 focus:scale-95 transition-transform"
        >
          <Plus className="w-8 h-8" />
        </motion.button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">
        <div className="max-w-md mx-auto acrylic bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex justify-around p-1.5 border border-white/60">
          <NavItem active={activeTab === 'today'} onClick={() => setActiveTab('today')} icon={<CalendarDays className="w-[22px] h-[22px]" />} label="今日" />
          <NavItem active={activeTab === 'week'} onClick={() => setActiveTab('week')} icon={<Columns className="w-[22px] h-[22px]" />} label="周" />
          <NavItem active={activeTab === 'month'} onClick={() => setActiveTab('month')} icon={<Calendar className="w-[22px] h-[22px]" />} label="月" />
          <NavItem active={activeTab === 'year'} onClick={() => setActiveTab('year')} icon={<CalendarRange className="w-[22px] h-[22px]" />} label="年" />
          <NavItem active={activeTab === 'someday'} onClick={() => setActiveTab('someday')} icon={<Compass className="w-[22px] h-[22px]" />} label="将来" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 px-4 py-1.5 rounded-lg transition-all duration-300 relative ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-105' : 'scale-100'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold tracking-wide ${active ? 'opacity-100' : 'opacity-70'}`}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="absolute inset-0 bg-blue-50/60 rounded-lg -z-10"
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}
