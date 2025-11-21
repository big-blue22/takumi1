
const dummyGoal = {
    id: 123456,
    title: 'Test Goal for Deletion',
    deadline: '2025-12-31',
    description: 'This goal is linked to a plan',
    gameGenre: 'fps',
    skillLevel: 'intermediate',
    progress: 0,
    hasCoachingPlan: true,
    planId: 'plan_123456'
};

const dummyPlan = {
    id: 'plan_123456',
    goalId: 123456,
    goalTitle: 'Test Goal for Deletion',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
    weeks: [
        {
            weekNumber: 1,
            startDate: '2025-01-01',
            endDate: '2025-01-07',
            focus: 'Focus Week 1',
            objectives: ['Obj 1'],
            milestones: ['Mile 1']
        }
    ],
    metadata: {
        gameGenre: 'fps',
        skillLevel: 'intermediate',
        totalWeeks: 1,
        estimatedTimePerDay: 60
    }
};

window.localStorage.setItem('goals', JSON.stringify([dummyGoal]));
window.localStorage.setItem('coaching_plans', JSON.stringify([dummyPlan]));
window.localStorage.setItem('initialSetupCompleted', 'true'); // Bypass setup
console.log('Dummy data injected');
