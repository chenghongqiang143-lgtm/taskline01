const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Today
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: t\.id, text: t\.text, type: 'scheduled' \}\)\}/g, "onLongPress={() => setEditingTask({ ...t, type: 'scheduled' })}");
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: t\.id, text: t\.text, type: 'temp' \}\)\}/g, "onLongPress={() => setEditingTask({ ...t, type: 'temp' })}");

// Habits
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: \`h-\$\{idx\}\`, text: t, type: 'habit' \}\)\}/g, "onLongPress={() => setEditingTask({ ...t, type: 'habit' })}");

// Planned
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: pt\.id, text: pt\.text, type: 'planned', taskType: pt\.taskType \}\)\}/g, "onLongPress={() => setEditingTask({ ...pt, type: 'planned' })}");

// Week day
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: \`wd-\$\{idx\}\`, text: task, type: 'week_day', dayIndex: item\.index \}\)\}/g, "onLongPress={() => setEditingTask({ ...task, type: 'week_day', dayIndex: item.index })}");

// Week sidebar (tabs)
code = code.replace(/setEditingTask\(\{ id: \`w-\$\{i\}\`, text: t, type, taskType: taskTypeMap\[type\] as any \}\);/g, "setEditingTask({ ...t, type });");

// Month/Year/Someday/Inbox
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: task\.id, text: task\.text, type: 'month' \}\)\}/g, "onLongPress={() => setEditingTask({ ...task, type: 'month' })}");
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: task\.id, text: task\.text, type: 'year' \}\)\}/g, "onLongPress={() => setEditingTask({ ...task, type: 'year' })}");
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: task\.id, text: task\.text, type: 'someday' \}\)\}/g, "onLongPress={() => setEditingTask({ ...task, type: 'someday' })}");
code = code.replace(/onLongPress=\{\(\) => setEditingTask\(\{ id: task\.id, text: task\.text, type: 'inbox' \}\)\}/g, "onLongPress={() => setEditingTask({ ...task, type: 'inbox' })}");

fs.writeFileSync('src/App.tsx', code);
