import { Achievement } from '@/store/pointsStore';

// ============================================
// 100 ACHIEVEMENTS - 8 CATEGORIES
// ============================================

export const ALL_ACHIEVEMENTS: Achievement[] = [
    // ==========================================
    // FOCUS (15) — based on totalFocusMinutes
    // ==========================================
    { id: 'f1', name: 'Baby Steps', description: 'Focus for 5 minutes', icon: '👶', requirement: 5, category: 'focus', bonusPoints: 10 },
    { id: 'f2', name: 'Getting Started', description: 'Focus for 15 minutes', icon: '🌱', requirement: 15, category: 'focus', bonusPoints: 15 },
    { id: 'f3', name: 'Half Hour Hero', description: 'Focus for 30 minutes', icon: '⏱️', requirement: 30, category: 'focus', bonusPoints: 20 },
    { id: 'f4', name: 'First Hour', description: 'Focus for 1 hour total', icon: '🕐', requirement: 60, category: 'focus', bonusPoints: 30 },
    { id: 'f5', name: 'Deep Thinker', description: 'Focus for 3 hours total', icon: '🧠', requirement: 180, category: 'focus', bonusPoints: 50 },
    { id: 'f6', name: 'Focus Apprentice', description: 'Focus for 5 hours total', icon: '📚', requirement: 300, category: 'focus', bonusPoints: 75 },
    { id: 'f7', name: 'Focus Master', description: 'Focus for 10 hours total', icon: '🎯', requirement: 600, category: 'focus', bonusPoints: 100 },
    { id: 'f8', name: 'Zone Warrior', description: 'Focus for 25 hours total', icon: '⚔️', requirement: 1500, category: 'focus', bonusPoints: 150 },
    { id: 'f9', name: 'Focus Legend', description: 'Focus for 50 hours total', icon: '🏆', requirement: 3000, category: 'focus', bonusPoints: 200 },
    { id: 'f10', name: 'Century Club', description: 'Focus for 100 hours total', icon: '💯', requirement: 6000, category: 'focus', bonusPoints: 300 },
    { id: 'f11', name: 'Marathon Mind', description: 'Focus for 200 hours total', icon: '🏃', requirement: 12000, category: 'focus', bonusPoints: 400 },
    { id: 'f12', name: 'Focus Titan', description: 'Focus for 300 hours total', icon: '🗿', requirement: 18000, category: 'focus', bonusPoints: 450 },
    { id: 'f13', name: 'Unstoppable Force', description: 'Focus for 500 hours total', icon: '🌋', requirement: 30000, category: 'focus', bonusPoints: 500 },
    { id: 'f14', name: 'Time Lord', description: 'Focus for 750 hours total', icon: '⏳', requirement: 45000, category: 'focus', bonusPoints: 500 },
    { id: 'f15', name: 'Eternal Focus', description: 'Focus for 1000 hours total', icon: '♾️', requirement: 60000, category: 'focus', bonusPoints: 500 },

    // ==========================================
    // TASKS (15) — based on totalTasksCompleted
    // ==========================================
    { id: 't1', name: 'First Task', description: 'Complete 1 task', icon: '✅', requirement: 1, category: 'tasks', bonusPoints: 10 },
    { id: 't2', name: 'Task Trio', description: 'Complete 3 tasks', icon: '📋', requirement: 3, category: 'tasks', bonusPoints: 15 },
    { id: 't3', name: 'High Five', description: 'Complete 5 tasks', icon: '🖐️', requirement: 5, category: 'tasks', bonusPoints: 20 },
    { id: 't4', name: 'Task Ten', description: 'Complete 10 tasks', icon: '🔟', requirement: 10, category: 'tasks', bonusPoints: 30 },
    { id: 't5', name: 'Quarter Century', description: 'Complete 25 tasks', icon: '📝', requirement: 25, category: 'tasks', bonusPoints: 50 },
    { id: 't6', name: 'Half Century', description: 'Complete 50 tasks', icon: '📊', requirement: 50, category: 'tasks', bonusPoints: 75 },
    { id: 't7', name: 'Task Centurion', description: 'Complete 100 tasks', icon: '🏅', requirement: 100, category: 'tasks', bonusPoints: 100 },
    { id: 't8', name: 'Task Machine', description: 'Complete 150 tasks', icon: '⚙️', requirement: 150, category: 'tasks', bonusPoints: 125 },
    { id: 't9', name: 'Task Commander', description: 'Complete 200 tasks', icon: '🎖️', requirement: 200, category: 'tasks', bonusPoints: 150 },
    { id: 't10', name: 'Task Overlord', description: 'Complete 300 tasks', icon: '👑', requirement: 300, category: 'tasks', bonusPoints: 200 },
    { id: 't11', name: 'Task Typhoon', description: 'Complete 400 tasks', icon: '🌪️', requirement: 400, category: 'tasks', bonusPoints: 250 },
    { id: 't12', name: 'Task Legend', description: 'Complete 500 tasks', icon: '🌟', requirement: 500, category: 'tasks', bonusPoints: 300 },
    { id: 't13', name: 'Task Titan', description: 'Complete 750 tasks', icon: '🗿', requirement: 750, category: 'tasks', bonusPoints: 400 },
    { id: 't14', name: 'Task Immortal', description: 'Complete 1000 tasks', icon: '💎', requirement: 1000, category: 'tasks', bonusPoints: 450 },
    { id: 't15', name: 'Task God', description: 'Complete 2000 tasks', icon: '⚡', requirement: 2000, category: 'tasks', bonusPoints: 500 },

    // ==========================================
    // STREAK (15) — based on longestStreak
    // ==========================================
    { id: 's1', name: 'Day One', description: '1 day streak', icon: '🔥', requirement: 1, category: 'streak', bonusPoints: 10 },
    { id: 's2', name: 'Triple Threat', description: '3 day streak', icon: '🔥', requirement: 3, category: 'streak', bonusPoints: 20 },
    { id: 's3', name: 'Week Warrior', description: '7 day streak', icon: '💪', requirement: 7, category: 'streak', bonusPoints: 50 },
    { id: 's4', name: 'Fortnight Fighter', description: '14 day streak', icon: '⚔️', requirement: 14, category: 'streak', bonusPoints: 75 },
    { id: 's5', name: 'Three Week Wonder', description: '21 day streak', icon: '🌟', requirement: 21, category: 'streak', bonusPoints: 100 },
    { id: 's6', name: 'Monthly Master', description: '30 day streak', icon: '👑', requirement: 30, category: 'streak', bonusPoints: 150 },
    { id: 's7', name: 'Consistency King', description: '45 day streak', icon: '🏰', requirement: 45, category: 'streak', bonusPoints: 200 },
    { id: 's8', name: 'Two Month Titan', description: '60 day streak', icon: '🗿', requirement: 60, category: 'streak', bonusPoints: 250 },
    { id: 's9', name: 'Quarter Year', description: '90 day streak', icon: '🌍', requirement: 90, category: 'streak', bonusPoints: 300 },
    { id: 's10', name: 'Semester Strong', description: '120 day streak', icon: '📚', requirement: 120, category: 'streak', bonusPoints: 350 },
    { id: 's11', name: 'Half Year Hero', description: '180 day streak', icon: '🦸', requirement: 180, category: 'streak', bonusPoints: 400 },
    { id: 's12', name: 'Nine Month Ninja', description: '270 day streak', icon: '🥷', requirement: 270, category: 'streak', bonusPoints: 450 },
    { id: 's13', name: 'Year of Focus', description: '365 day streak', icon: '🎆', requirement: 365, category: 'streak', bonusPoints: 500 },
    { id: 's14', name: 'Beyond Limits', description: '500 day streak', icon: '🚀', requirement: 500, category: 'streak', bonusPoints: 500 },
    { id: 's15', name: 'Streak Immortal', description: '730 day streak (2 years!)', icon: '♾️', requirement: 730, category: 'streak', bonusPoints: 500 },

    // ==========================================
    // POINTS (10) — based on totalPointsEarned
    // ==========================================
    { id: 'p1', name: 'First Hundred', description: 'Earn 100 points', icon: '⭐', requirement: 100, category: 'points', bonusPoints: 10 },
    { id: 'p2', name: 'Point Collector', description: 'Earn 500 points', icon: '🌟', requirement: 500, category: 'points', bonusPoints: 25 },
    { id: 'p3', name: 'Thousand Club', description: 'Earn 1,000 points', icon: '💫', requirement: 1000, category: 'points', bonusPoints: 50 },
    { id: 'p4', name: 'Point Hoarder', description: 'Earn 2,500 points', icon: '🏦', requirement: 2500, category: 'points', bonusPoints: 75 },
    { id: 'p5', name: 'Five Grand', description: 'Earn 5,000 points', icon: '💰', requirement: 5000, category: 'points', bonusPoints: 100 },
    { id: 'p6', name: 'Point Baron', description: 'Earn 10,000 points', icon: '🤑', requirement: 10000, category: 'points', bonusPoints: 150 },
    { id: 'p7', name: 'Point Tycoon', description: 'Earn 25,000 points', icon: '💎', requirement: 25000, category: 'points', bonusPoints: 250 },
    { id: 'p8', name: 'Point Mogul', description: 'Earn 50,000 points', icon: '👔', requirement: 50000, category: 'points', bonusPoints: 350 },
    { id: 'p9', name: 'Point Emperor', description: 'Earn 75,000 points', icon: '🏛️', requirement: 75000, category: 'points', bonusPoints: 450 },
    { id: 'p10', name: 'Point God', description: 'Earn 100,000 points', icon: '🌌', requirement: 100000, category: 'points', bonusPoints: 500 },

    // ==========================================
    // ALARM (10) — alarmsOnTime (no-snooze)
    // ==========================================
    { id: 'a1', name: 'Early Bird', description: 'Wake on time once', icon: '🐦', requirement: 1, category: 'alarm', bonusPoints: 10 },
    { id: 'a2', name: 'Morning Person', description: 'Wake on time 5 times', icon: '🌅', requirement: 5, category: 'alarm', bonusPoints: 25 },
    { id: 'a3', name: 'Rise & Shine', description: 'Wake on time 10 times', icon: '☀️', requirement: 10, category: 'alarm', bonusPoints: 50 },
    { id: 'a4', name: 'Dawn Warrior', description: 'Wake on time 25 times', icon: '⚔️', requirement: 25, category: 'alarm', bonusPoints: 75 },
    { id: 'a5', name: 'No Snooze Zone', description: 'Wake on time 50 times', icon: '🚫', requirement: 50, category: 'alarm', bonusPoints: 100 },
    { id: 'a6', name: 'Morning Champion', description: 'Wake on time 75 times', icon: '🏆', requirement: 75, category: 'alarm', bonusPoints: 150 },
    { id: 'a7', name: 'Alarm Destroyer', description: 'Wake on time 100 times', icon: '💥', requirement: 100, category: 'alarm', bonusPoints: 200 },
    { id: 'a8', name: 'Dawn Commander', description: 'Wake on time 150 times', icon: '🎖️', requirement: 150, category: 'alarm', bonusPoints: 300 },
    { id: 'a9', name: 'Sleep Conqueror', description: 'Wake on time 200 times', icon: '👑', requirement: 200, category: 'alarm', bonusPoints: 400 },
    { id: 'a10', name: 'Alarm Immortal', description: 'Wake on time 365 times', icon: '♾️', requirement: 365, category: 'alarm', bonusPoints: 500 },

    // ==========================================
    // SESSIONS (15) — totalSessionsCompleted
    // ==========================================
    { id: 'ss1', name: 'First Session', description: 'Complete 1 focus session', icon: '🎬', requirement: 1, category: 'sessions', bonusPoints: 10 },
    { id: 'ss2', name: 'Getting Focused', description: 'Complete 3 sessions', icon: '🔍', requirement: 3, category: 'sessions', bonusPoints: 15 },
    { id: 'ss3', name: 'Session Five', description: 'Complete 5 sessions', icon: '✋', requirement: 5, category: 'sessions', bonusPoints: 20 },
    { id: 'ss4', name: 'Double Digits', description: 'Complete 10 sessions', icon: '🔟', requirement: 10, category: 'sessions', bonusPoints: 30 },
    { id: 'ss5', name: 'Session Starter', description: 'Complete 25 sessions', icon: '🚀', requirement: 25, category: 'sessions', bonusPoints: 50 },
    { id: 'ss6', name: 'Session Regular', description: 'Complete 50 sessions', icon: '📅', requirement: 50, category: 'sessions', bonusPoints: 75 },
    { id: 'ss7', name: 'Session Centurion', description: 'Complete 100 sessions', icon: '💯', requirement: 100, category: 'sessions', bonusPoints: 100 },
    { id: 'ss8', name: 'Session Addict', description: 'Complete 150 sessions', icon: '🧲', requirement: 150, category: 'sessions', bonusPoints: 125 },
    { id: 'ss9', name: 'Session Expert', description: 'Complete 200 sessions', icon: '🎓', requirement: 200, category: 'sessions', bonusPoints: 150 },
    { id: 'ss10', name: 'Session Machine', description: 'Complete 300 sessions', icon: '🤖', requirement: 300, category: 'sessions', bonusPoints: 200 },
    { id: 'ss11', name: 'Session Beast', description: 'Complete 500 sessions', icon: '🦁', requirement: 500, category: 'sessions', bonusPoints: 300 },
    { id: 'ss12', name: 'Session Legend', description: 'Complete 750 sessions', icon: '🌟', requirement: 750, category: 'sessions', bonusPoints: 400 },
    { id: 'ss13', name: 'Session Titan', description: 'Complete 1000 sessions', icon: '🗿', requirement: 1000, category: 'sessions', bonusPoints: 450 },
    { id: 'ss14', name: 'Session Immortal', description: 'Complete 2000 sessions', icon: '💎', requirement: 2000, category: 'sessions', bonusPoints: 500 },
    { id: 'ss15', name: 'Session God', description: 'Complete 5000 sessions', icon: '⚡', requirement: 5000, category: 'sessions', bonusPoints: 500 },

    // ==========================================
    // MILESTONE (10) — special combined
    // ==========================================
    { id: 'm1', name: 'First Day Done', description: 'Complete a task & a session in one day', icon: '🎯', requirement: 1, category: 'milestone', bonusPoints: 25 },
    { id: 'm2', name: 'Productive Morning', description: 'Wake on time + complete a session before noon', icon: '🌄', requirement: 1, category: 'milestone', bonusPoints: 50 },
    { id: 'm3', name: 'Weekly Warrior', description: 'Earn 500+ points in a week', icon: '🛡️', requirement: 500, category: 'milestone', bonusPoints: 75 },
    { id: 'm4', name: 'Perfect Week', description: 'Hit daily goal 7 days in a row', icon: '💫', requirement: 7, category: 'milestone', bonusPoints: 100 },
    { id: 'm5', name: 'Balanced Life', description: 'Use all 5 app features in one day', icon: '⚖️', requirement: 5, category: 'milestone', bonusPoints: 100 },
    { id: 'm6', name: 'Overachiever', description: 'Earn 2x your daily point goal', icon: '📈', requirement: 2, category: 'milestone', bonusPoints: 150 },
    { id: 'm7', name: 'Monthly Mogul', description: 'Earn 5,000+ points in a month', icon: '🏆', requirement: 5000, category: 'milestone', bonusPoints: 200 },
    { id: 'm8', name: 'Habit Formed', description: '21 day streak + 50 sessions', icon: '🧬', requirement: 21, category: 'milestone', bonusPoints: 250 },
    { id: 'm9', name: 'Elite Status', description: '100 tasks + 100 sessions + 30 day streak', icon: '🏛️', requirement: 100, category: 'milestone', bonusPoints: 400 },
    { id: 'm10', name: 'Ascended', description: 'Unlock 50 other achievements', icon: '🌌', requirement: 50, category: 'milestone', bonusPoints: 500 },

    // ==========================================
    // LEGENDARY (10) — ultimate challenges
    // ==========================================
    { id: 'l1', name: 'Iron Will', description: 'Never snooze for 30 consecutive alarms', icon: '🔩', requirement: 30, category: 'legendary', bonusPoints: 200 },
    { id: 'l2', name: 'Perfectionist', description: '100% session completion rate over 20+ sessions', icon: '💎', requirement: 20, category: 'legendary', bonusPoints: 250 },
    { id: 'l3', name: 'Marathon Day', description: 'Focus for 8 hours in a single day', icon: '🏃', requirement: 480, category: 'legendary', bonusPoints: 300 },
    { id: 'l4', name: 'Zen Master', description: 'Complete 10 sessions without pausing', icon: '🧘', requirement: 10, category: 'legendary', bonusPoints: 300 },
    { id: 'l5', name: 'Task Tornado', description: 'Complete 10 tasks in one day', icon: '🌪️', requirement: 10, category: 'legendary', bonusPoints: 350 },
    { id: 'l6', name: 'Unbreakable', description: '90 day streak', icon: '🛡️', requirement: 90, category: 'legendary', bonusPoints: 400 },
    { id: 'l7', name: 'Point Supernova', description: 'Earn 5,000 points in a single day', icon: '💥', requirement: 5000, category: 'legendary', bonusPoints: 400 },
    { id: 'l8', name: 'Focus Demigod', description: '500 hours focused + 500 sessions', icon: '⚡', requirement: 500, category: 'legendary', bonusPoints: 450 },
    { id: 'l9', name: 'The Perfecter', description: '365 day streak + 1000 tasks', icon: '🌠', requirement: 365, category: 'legendary', bonusPoints: 500 },
    { id: 'l10', name: 'FocusGuard God', description: 'Unlock ALL other achievements', icon: '🏆', requirement: 99, category: 'legendary', bonusPoints: 500 },
];

export default ALL_ACHIEVEMENTS;
