const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startIndex = content.indexOf('  return (\n    <AnimatePresence>');
const endIndex = content.indexOf('  );\n};\n\n// PressableItem component') + 7;

if (startIndex === -1 || endIndex === -1) {
  console.log('Boundaries not found');
  process.exit(1);
}

const replacement = `  return (
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
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-gray-50 flex flex-col overflow-hidden sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {initialData ? '编辑' : '新增'}{goalType === 'month' ? '月度' : goalType === 'year' ? '年度' : '将来'}目标
              </h3>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900 bg-gray-50">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Goal Name */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1.5">目标名称</label>
                <input 
                  type="text"
                  placeholder="输入目标名称..."
                  className="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold shadow-sm placeholder:font-normal placeholder:text-gray-400"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1.5">类别分类</label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {['工作', '个人', '健康', '财务', '学习', '旅行', '创意'].map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap \${
                        category === cat 
                          ? 'bg-gray-900 border-gray-900 text-white shadow-md' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }\`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Results */}
              <div>
                <div className="flex justify-between items-center mb-1.5 pl-1">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">关键结果 (KR)</label>
                  <button onClick={handleAddKR} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 active:scale-95 transition-transform">
                    <Plus className="w-3 h-3" /> 添加 KR
                  </button>
                </div>
                
                <div className="space-y-3">
                  {keyResults.map((kr, idx) => (
                    <div key={kr.id} className="bg-white p-3 rounded-xl border border-gray-200/60 shadow-sm relative group">
                      <button onClick={() => handleDeleteKR(kr.id)} className="absolute top-3 right-3 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      
                      <div className="flex gap-2 mb-3 pr-6">
                        <span className="text-sm font-bold text-gray-300 mt-1">KR{idx+1}</span>
                        <input 
                          type="text"
                          placeholder="描述具体且可衡量的结果..."
                          className="w-full bg-transparent border-b border-gray-100 focus:border-blue-500 pb-1.5 outline-none font-medium text-gray-800 placeholder:text-gray-400 text-sm"
                          value={kr.name}
                          onChange={e => handleUpdateKRName(kr.id, e.target.value)}
                        />
                      </div>
                      
                      {/* KR Tasks */}
                      <div className="pl-7 space-y-1.5">
                        {kr.tasks.map(t => (
                          <div key={t.id} className="flex justify-between items-center group/task bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                            <span className="text-xs text-gray-700 flex items-center gap-1.5 flex-1">
                              {t.isExisting ? <LinkIcon className="w-3 h-3 text-blue-500" /> : <ListTodo className="w-3 h-3 text-gray-400" />}
                              <span className="line-clamp-1">{t.text}</span>
                            </span>
                            <button onClick={() => handleDeleteTask(kr.id, t.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity p-0.5">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        
                        <div className="flex items-center gap-1.5 pt-1">
                          <input 
                            type="text"
                            placeholder="新建下一步操作..."
                            className="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-gray-400"
                            value={newTaskTexts[kr.id] || ''}
                            onChange={e => setNewTaskTexts({ ...newTaskTexts, [kr.id]: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleAddNewTask(kr.id)}
                          />
                          <button onClick={() => handleAddNewTask(kr.id)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                          <div className="w-px h-3 bg-gray-200"></div>
                          <button onClick={() => setIsTaskPickerOpen(isTaskPickerOpen === kr.id ? null : kr.id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors flex items-center gap-1">
                            <Inbox className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        {/* Task Picker */}
                        <AnimatePresence>
                          {isTaskPickerOpen === kr.id && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-1.5"
                            >
                              <div className="bg-gray-50 rounded-lg p-1.5 border border-gray-200/60 max-h-32 overflow-y-auto w-full no-scrollbar">
                                <p className="text-[10px] font-bold text-gray-400 uppercase px-1.5 mb-1">从收集箱选择:</p>
                                {inboxTasks.filter(it => !kr.tasks.some(t => t.id === it.id)).map(task => (
                                  <button 
                                    key={task.id} 
                                    onClick={() => handlePickExistingTask(kr.id, task)}
                                    className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-white rounded-md border border-transparent hover:border-gray-100 transition-all truncate"
                                  >
                                    {task.text}
                                  </button>
                                ))}
                                {inboxTasks.filter(it => !kr.tasks.some(t => t.id === it.id)).length === 0 && (
                                  <p className="text-xs text-gray-500 italic p-1.5">收集箱为空</p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    </div>
                  ))}
                  
                  {keyResults.length === 0 && (
                    <button onClick={handleAddKR} className="w-full border border-dashed border-gray-300 bg-gray-50/50 rounded-xl p-4 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors group">
                      <Target className="w-5 h-5 text-gray-300 mx-auto mb-1.5 group-hover:text-gray-400 transition-colors" />
                      <p className="text-xs font-bold text-gray-500 group-hover:text-gray-600 transition-colors">添加关键结果 (KR)</p>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 z-10 sticky bottom-0">
              {initialData && onDelete ? (
                <button 
                  onClick={() => onDelete(initialData.id)}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-colors shadow-sm"
                >
                  删除
                </button>
              ) : (
                <button 
                  onClick={onClose}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
                >
                  取消
                </button>
              )}
              <button 
                onClick={save}
                disabled={!name.trim()}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform"
              >
                保存 <Check className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/App.tsx', newContent);
console.log('Goal Modal UI updated!');
