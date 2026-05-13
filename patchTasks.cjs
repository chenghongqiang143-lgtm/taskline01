const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const replaceStar = (str) => str.replace(
  /<span className=\{\`text-sm font-medium text-[^`]+\`\}>\{task.text\}<\/span>/g,
  match => match + '\n                  <button onClick={(e) => { e.stopPropagation(); toggleTaskImportant(task.id); }} className={`ml-auto p-1.5 transition-colors ${task.important ? \'text-yellow-500\' : \'text-gray-300 hover:text-yellow-500\'}`}><Star className="w-5 h-5" fill={task.important ? \'currentColor\' : \'none\'} /></button>'
);

const replaceScheduledTempStar = (str) => str.replace(
  /<span className=\{\`text-\[12px\] font-bold truncate[^`]+\`\}>\{t.text\}<\/span>/g,
  match => match + '\n                  <button onClick={(e) => { e.stopPropagation(); toggleTaskImportant(t.id); }} className={`ml-auto p-0.5 transition-opacity opacity-0 group-hover:opacity-100 ${t.important ? \'text-yellow-500 opacity-100\' : \'text-gray-300 hover:text-yellow-500\'}`}><Star className="w-3.5 h-3.5" fill={t.important ? \'currentColor\' : \'none\'} /></button>'
);

code = replaceStar(code);
code = replaceScheduledTempStar(code);

fs.writeFileSync('src/App.tsx', code);
