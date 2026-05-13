const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replacement for month goals
const monthRepl = `<div key={p.id} className="fluent-card p-4 group" onClick={() => { setGoalType('month'); setEditingGoal(p); setIsGoalModalOpen(true); }}>`;
content = content.replace(/<div key=\{p\.id\} className="fluent-card p-4 group">/g, (match, offset) => {
    // Determine which goal type by looking at nearby code
    const surrounding = content.substring(Math.max(0, offset - 200), offset);
    if (surrounding.includes('monthGoals.filter')) {
        return `<div key={p.id} onClick={() => { setGoalType('month'); setEditingGoal(p); setIsGoalModalOpen(true); }} className="fluent-card p-4 group cursor-pointer hover:ring-2 ring-blue-500/20 transition-all">`;
    } else if (surrounding.includes('yearGoals.filter')) {
        return `<div key={p.id} onClick={() => { setGoalType('year'); setEditingGoal(p); setIsGoalModalOpen(true); }} className="fluent-card p-4 group cursor-pointer hover:ring-2 ring-indigo-500/20 transition-all">`;
    } else if (surrounding.includes('somedayGoals.filter')) {
        return `<div key={p.id} onClick={() => { setGoalType('someday'); setEditingGoal(p); setIsGoalModalOpen(true); }} className="fluent-card p-4 group cursor-pointer hover:ring-2 ring-purple-500/20 transition-all">`;
    }
    return match;
});

fs.writeFileSync('src/App.tsx', content);
console.log('Cards onClick patched!');
