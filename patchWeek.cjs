const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('useMemo')) {
  code = code.replace(/import React, \{ useState, useRef, useEffect \} from 'react';/, 'import React, { useState, useRef, useEffect, useMemo } from \'react\';');
}

const customHooks = `
  const importantTasksStr = useMemo(() => {
    const tasks = [];
    [...scheduledTasks, ...tempTasks, ...plannedTasks, ...monthTasks, ...yearTasks, ...somedayTasks].forEach(t => {
      if (t.important && !tasks.includes(t.text)) tasks.push(t.text);
    });
    [...monthGoals, ...yearGoals, ...somedayGoals].forEach(g => {
      g.keyResults?.forEach(kr => {
        kr.tasks.forEach(t => {
          if (t.important && !tasks.includes(t.text)) tasks.push(t.text);
        });
      });
    });
    return tasks;
  }, [scheduledTasks, tempTasks, plannedTasks, monthTasks, yearTasks, somedayTasks, monthGoals, yearGoals, somedayGoals]);

  const allWeekNextTasks = useMemo(() => {
    const combined = [...weekNextTasks];
    importantTasksStr.forEach(t => {
      if (!combined.includes(t)) combined.push(t);
    });
    return combined;
  }, [weekNextTasks, importantTasksStr]);
`;

code = code.replace(/(const renderWeek = \(\) => \()/, customHooks + '\n  $1');

// Replace weekNextTasks to allWeekNextTasks inside weekTask mapping
let newCode = code.replace(
  /\(\(weekTab === '全部' \? \[\.\.\.weekWaitTasks, \.\.\.weekNextTasks, \.\.\.weekRepeatTasks\](?:\s|.)*?weekNextTasks\.includes\(t\) \? 'week_next' : 'week_repeat';/g,
  function(match) {
    return match.replace(/weekNextTasks/g, 'allWeekNextTasks');
  }
);

fs.writeFileSync('src/App.tsx', newCode);
