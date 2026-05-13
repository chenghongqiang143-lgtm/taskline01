const fs = require('fs');

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const startIndex = content.indexOf('interface NewGoalModalProps {');
const endIndex = content.indexOf('  return (');

if (startIndex === -1 || endIndex === -1) {
  console.log('Boundaries not found');
  process.exit(1);
}

const replacement = `interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalType: 'month' | 'year' | 'someday';
  inboxTasks: { id: string, text: string }[];
  initialData?: Goal | null;
  onSave: (
    editedGoal: Omit<Goal, 'id' | 'progress' | 'color'> & { id?: string },
    movedTaskIds: string[]
  ) => void;
  onDelete?: (id: string) => void;
}

const GoalModalComponent: React.FC<GoalModalProps> = ({ isOpen, onClose, goalType, inboxTasks, initialData, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('工作');
  const [keyResults, setKeyResults] = useState<{ id: string; name: string; tasks: { id: string; text: string; isExisting: boolean }[] }[]>([]);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState<string | null>(null);
  const [newTaskTexts, setNewTaskTexts] = useState<Record<string, string>>({});

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCategory(initialData.category);
        if (initialData.keyResults) {
          setKeyResults(initialData.keyResults.map(kr => ({
            id: kr.id,
            name: kr.name,
            tasks: kr.tasks.map(t => ({ id: t.id, text: t.text, isExisting: false }))
          })));
        } else {
          setKeyResults([]);
        }
      } else {
        setName('');
        setCategory('工作');
        setKeyResults([]);
      }
      setIsTaskPickerOpen(null);
      setNewTaskTexts({});
    }
  }, [isOpen, initialData]);

  const handleAddKR = () => {
    setKeyResults([...keyResults, { id: \`kr-\${Date.now()}\`, name: '', tasks: [] }]);
  };

  const handleUpdateKRName = (krId: string, krName: string) => {
    setKeyResults(keyResults.map(kr => kr.id === krId ? { ...kr, name: krName } : kr));
  };

  const handleDeleteKR = (krId: string) => {
    setKeyResults(keyResults.filter(kr => kr.id !== krId));
  };

  const handleAddNewTask = (krId: string) => {
    const text = newTaskTexts[krId];
    if (!text || !text.trim()) return;
    setKeyResults(keyResults.map(kr => 
      kr.id === krId ? { ...kr, tasks: [...kr.tasks, { id: \`tnew-\${Date.now()}\`, text: text.trim(), isExisting: false }] } : kr
    ));
    setNewTaskTexts({ ...newTaskTexts, [krId]: '' });
  };

  const handlePickExistingTask = (krId: string, task: { id: string, text: string }) => {
    setKeyResults(keyResults.map(kr => 
      kr.id === krId ? { ...kr, tasks: [...kr.tasks, { id: task.id, text: task.text, isExisting: true }] } : kr
    ));
    setIsTaskPickerOpen(null);
  };

  const handleDeleteTask = (krId: string, taskId: string) => {
    setKeyResults(keyResults.map(kr => 
      kr.id === krId ? { ...kr, tasks: kr.tasks.filter(t => t.id !== taskId) } : kr
    ));
  };

  const save = () => {
    if (!name.trim()) return;
    const finalKRs: KeyResult[] = keyResults.filter(kr => kr.name.trim()).map(kr => ({
      ...kr,
      tasks: kr.tasks.map(t => ({ id: t.id, text: t.text, completed: false }))
    }));
    const movedIds = keyResults.flatMap(kr => kr.tasks.filter(t => t.isExisting).map(t => t.id));
    
    let defaultDate = '将来';
    if (goalType === 'month') defaultDate = '待定';
    if (goalType === 'year') defaultDate = '全年';

    onSave({ id: initialData?.id, name, category, keyResults: finalKRs, date: defaultDate }, movedIds);
  };

`;

const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('src/App.tsx', newContent);
console.log('Goal Modal state updated!');
