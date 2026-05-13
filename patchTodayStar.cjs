const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// temp Tasks
code = code.replace(
  /<span className=\{\`text-\[10px\] font-medium text-\[#4f5b3a\] leading-tight[^>]*\}>\{t.text\}<\/span>/g,
  match => match + '\n                    <button onClick={(e) => { e.stopPropagation(); toggleTaskImportant(t.id); }} className={`ml-auto p-0.5 transition-opacity opacity-0 group-hover:opacity-100 ${t.important ? \'text-yellow-500 opacity-100\' : \'text-[#4f5b3a]/50 hover:text-yellow-500\'}`}><Star className="w-3.5 h-3.5" fill={t.important ? \'currentColor\' : \'none\'} /></button>'
);

// scheduled Tasks
code = code.replace(
  /<span className=\{\`text-\[10px\] font-medium text-\[#4a5d7e\] leading-tight[^>]*\}>\{t.text\}<\/span>/g,
  match => match + '\n                    <button onClick={(e) => { e.stopPropagation(); toggleTaskImportant(t.id); }} className={`ml-auto p-0.5 transition-opacity opacity-0 group-hover:opacity-100 ${t.important ? \'text-yellow-500 opacity-100\' : \'text-[#4a5d7e]/50 hover:text-yellow-500\'}`}><Star className="w-3.5 h-3.5" fill={t.important ? \'currentColor\' : \'none\'} /></button>'
);

// planned Tasks
code = code.replace(
  /<span className=\{\`text-\[11px\] font-bold text-\[#4a5d7e\] leading-tight[^>]*\}>\s*\{pt.text\}\s*<\/span>/g,
  match => match + '\n                      <button onClick={(e) => { e.stopPropagation(); toggleTaskImportant(pt.id); }} className={`ml-auto p-0.5 transition-opacity opacity-0 group-hover:opacity-100 ${pt.important ? \'text-yellow-500 opacity-100\' : \'text-[#4a5d7e]/50 hover:text-yellow-500\'}`}><Star className="w-3.5 h-3.5" fill={pt.important ? \'currentColor\' : \'none\'} /></button>'
);

fs.writeFileSync('src/App.tsx', code);
