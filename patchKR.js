const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldUI = `                              <span className="line-clamp-1">{t.text}</span>
                            </span>
                            <button onClick={() => handleDeleteTask(kr.id, t.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover/task:opacity-100 transition-opacity p-0.5">
                              <X className="w-3.5 h-3.5" />
                            </button>`;

const newUI = `                              <span className="line-clamp-1">{t.text}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button onClick={(e) => { e.preventDefault(); handleToggleKRTaskImportant(kr.id, t.id); }} className={\`p-0.5 transition-opacity \${t.important ? 'text-yellow-500 opacity-100' : 'text-gray-400 opacity-0 group-hover/task:opacity-100 hover:text-yellow-500'}\`}>
                                <Star className="w-3.5 h-3.5" fill={t.important ? 'currentColor' : 'none'} />
                              </button>
                              <button onClick={() => handleDeleteTask(kr.id, t.id)} className="opacity-0 group-hover/task:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-0.5">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>`;

code = code.replace(oldUI, newUI);

const oldDiv = '<div key={t.id} className="flex justify-between items-center group/task bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm">';
const newDiv = '<div key={t.id} className={`flex justify-between items-center group/task bg-gray-50 px-2.5 py-1.5 rounded-lg border shadow-sm ${t.important ? \'border-yellow-200 bg-yellow-50/50\' : \'border-gray-100\'}`}>';
code = code.replace(oldDiv, newDiv);

fs.writeFileSync('src/App.tsx', code);
