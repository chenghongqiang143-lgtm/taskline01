const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add editingGoal state
const stateReplacement = `  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalType, setGoalType] = useState<'month' | 'year' | 'someday'>('month');`;

let newContent = content.replace(
  `  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);\n  const [goalType, setGoalType] = useState<'month' | 'year' | 'someday'>('month');`,
  stateReplacement
);

// 2. Wrap handleSaveNewGoal with logic for updating existing OR creating new
const saveGoalOrig = `  const handleSaveNewGoal = (newGoalRaw: Omit<Goal, 'id' | 'progress' | 'color'>, movedTaskIds: string[]) => {
    let color = 'blue';
    if (goalType === 'year') color = 'indigo';
    if (goalType === 'someday') color = 'purple';
    
    const finalGoal: Goal = {
      ...newGoalRaw,
      id: \`g-\${Date.now()}\`,
      progress: 0,
      color,
    };

    if (goalType === 'month') setMonthGoals([...monthGoals, finalGoal]);
    else if (goalType === 'year') setYearGoals([...yearGoals, finalGoal]);
    else setSomedayGoals([...somedayGoals, finalGoal]);

    if (movedTaskIds.length > 0) {
      setInboxTasks(inboxTasks.filter(t => !movedTaskIds.includes(t.id)));
    }
    
    setIsGoalModalOpen(false);
  };`;

const saveGoalReplacement = `  const handleSaveGoal = (editedGoal: Omit<Goal, 'id' | 'progress' | 'color'> & { id?: string }, movedTaskIds: string[]) => {
    let color = 'blue';
    if (goalType === 'year') color = 'indigo';
    if (goalType === 'someday') color = 'purple';
    
    if (editedGoal.id) {
      // Editing existing goal
      const updateList = (list: Goal[]) => list.map(g => g.id === editedGoal.id ? { ...g, ...editedGoal } as Goal : g);
      if (goalType === 'month') setMonthGoals(updateList(monthGoals));
      else if (goalType === 'year') setYearGoals(updateList(yearGoals));
      else setSomedayGoals(updateList(somedayGoals));
    } else {
      // Creating new goal
      const finalGoal: Goal = {
        ...editedGoal,
        id: \`g-\${Date.now()}\`,
        progress: 0,
        color,
      };
      if (goalType === 'month') setMonthGoals([...monthGoals, finalGoal]);
      else if (goalType === 'year') setYearGoals([...yearGoals, finalGoal]);
      else setSomedayGoals([...somedayGoals, finalGoal]);
    }

    if (movedTaskIds.length > 0) {
      setInboxTasks(inboxTasks.filter(t => !movedTaskIds.includes(t.id)));
    }
    
    setEditingGoal(null);
    setIsGoalModalOpen(false);
  };

  const handleDeleteGoal = (id: string) => {
    if (goalType === 'month') setMonthGoals(monthGoals.filter(g => g.id !== id));
    else if (goalType === 'year') setYearGoals(yearGoals.filter(g => g.id !== id));
    else setSomedayGoals(somedayGoals.filter(g => g.id !== id));
    setEditingGoal(null);
    setIsGoalModalOpen(false);
  };`;

newContent = newContent.replace(
  `  const handleSaveNewGoal = (newGoalRaw: Omit<Goal, 'id' | 'progress' | 'color'>, movedTaskIds: string[]) => {
    let color = 'blue';
    if (goalType === 'year') color = 'indigo';
    if (goalType === 'someday') color = 'purple';
    
    const finalGoal: Goal = {
      ...newGoalRaw,
      id: \`g-\${Date.now()}\`,
      progress: 0,
      color,
    };

    if (goalType === 'month') setMonthGoals([...monthGoals, finalGoal]);
    else if (goalType === 'year') setYearGoals([...yearGoals, finalGoal]);
    else setSomedayGoals([...somedayGoals, finalGoal]);

    if (movedTaskIds.length > 0) {
      setInboxTasks(inboxTasks.filter(t => !movedTaskIds.includes(t.id)));
    }
    
    setIsGoalModalOpen(false);
  };`, saveGoalReplacement);


// 3. Update <GoalModalComponent />
const modalInvocationOrig = `<GoalModalComponent 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goalType={goalType}
        inboxTasks={inboxTasks}
        onSave={handleSaveNewGoal}
      />`;

const modalInvocationReplacement = `<GoalModalComponent 
        isOpen={isGoalModalOpen || !!editingGoal}
        onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }}
        goalType={goalType}
        inboxTasks={inboxTasks}
        initialData={editingGoal}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
      />`;

newContent = newContent.replace(modalInvocationOrig, modalInvocationReplacement);

// 4. Update the goal cards to have onClick
const oldGoalCardUI = `<div key={p.id} className="fluent-card p-4 group">`;
const newGoalCardUI = (type) => `<div key={p.id} onClick={() => { setGoalType('${type}'); setEditingGoal(p); }} className="fluent-card p-4 group cursor-pointer hover:border-blue-200 transition-colors">`;

if (newContent.includes(oldGoalCardUI)) {
    // Just blindly replace but need to set the goalType right. Let's do it carefully.
    // Instead of doing it blind, let's use regex to replace within the 3 tabs.
}

fs.writeFileSync('src/App.tsx', newContent);
console.log('App.tsx handles editing goals now');
