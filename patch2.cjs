const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startIndex = content.indexOf('  const renderEditTaskModal = () => (');
const endIndex = content.indexOf('  const handleSaveNewGoal = (newGoalRaw: Omit<Goal');

if (startIndex === -1 || endIndex === -1) {
  console.log('Boundaries not found');
  process.exit(1);
}

const replacement = `  const renderEditTaskModal = () => (
    <AnimatePresence>
      {editingTask && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-5">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditingTask(null)}
          />
          <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-sm bg-gray-50 flex flex-col overflow-hidden sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900 line-clamp-1">编辑任务</h3>
              <button 
                onClick={() => setEditingTask(null)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 bg-gray-50 text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 p-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1.5">任务名称</label>
                <textarea 
                  autoFocus
                  className="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium resize-none shadow-sm"
                  rows={2}
                  value={editingTask.text}
                  onChange={e => setEditingTask({ ...editingTask, text: e.target.value })}
                />
              </div>

              {['week_wait', 'week_next', 'week_repeat', 'week_day'].includes(editingTask.type) && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1.5">任务类型</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['等待', '下一步', '重复事项'].map(typeLabel => {
                      const valueMap: Record<string, string> = {
                        '等待': 'waiting',
                        '下一步': 'next',
                        '重复事项': 'recurring'
                      };
                      const val = valueMap[typeLabel];
                      return (
                        <button 
                          key={typeLabel}
                          onClick={() => setEditingTask({ ...editingTask, taskType: val as any })}
                          className={\`p-2.5 rounded-xl flex flex-col items-center gap-1 transition-all border \${
                            editingTask.taskType === val 
                              ? 'bg-gray-900 text-white shadow-md border-gray-900' 
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }\`}
                        >
                          {typeLabel === '等待' && <Clock className={\`w-4 h-4 \${editingTask.taskType === val ? 'text-white' : 'text-gray-400'}\`} />}
                          {typeLabel === '下一步' && <ArrowRight className={\`w-4 h-4 \${editingTask.taskType === val ? 'text-white' : 'text-gray-400'}\`} />}
                          {typeLabel === '重复事项' && <Repeat className={\`w-4 h-4 \${editingTask.taskType === val ? 'text-white' : 'text-gray-400'}\`} />}
                          <span className="mt-0.5 text-xs font-bold">{typeLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {editingTask.type === 'planned' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1.5">状态类型</label>
                  <select 
                    className="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium shadow-sm text-gray-700"
                    value={editingTask.taskType || 'normal'}
                    onChange={e => setEditingTask({ ...editingTask, taskType: e.target.value as any })}
                  >
                    <option value="normal">常规</option>
                    <option value="waiting">等待</option>
                    <option value="next">下一步</option>
                    <option value="recurring">重复事项</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleDeleteTask}
                  className="px-4 py-3 bg-white text-red-600 font-bold rounded-xl border border-gray-200 text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  删除
                </button>
                <button 
                  onClick={() => handleUpdateTask(editingTask.text, editingTask.taskType)}
                  className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-transform text-sm"
                >
                  保存修改
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/App.tsx', newContent);
console.log('Edit Task Modal updated!');
