/**
 * Shop Items Data
 * All purchasable items organized by category
 */

export type ShopCategory = 'themes' | 'sounds' | 'avatars' | 'titles' | 'powerups';

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    category: ShopCategory;
    price: number;
    icon: string;
    unlockLevel: number;   // Minimum rank level required to purchase
    preview?: string;      // Optional preview data (color hex for themes, etc.)
}

export interface ThemeColors {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentSecondary: string;
    border: string;
    shadow: string;
    cardBg: string;
    tabBarBg: string;
    tabBarActive: string;
}

// ============================================
// THEME DEFINITIONS
// ============================================
export const THEME_COLORS: Record<string, ThemeColors> = {
    default: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        text: '#000000',
        textSecondary: '#666666',
        accent: '#FF007F',
        accentSecondary: '#00FFFF',
        border: '#000000',
        shadow: '#000000',
        cardBg: '#FFFFFF',
        tabBarBg: '#000000',
        tabBarActive: '#FF007F',
    },
    midnight_blue: {
        background: '#0A1628',
        surface: '#132238',
        text: '#E8EDF4',
        textSecondary: '#8899AA',
        accent: '#4A9EFF',
        accentSecondary: '#C0C0C0',
        border: '#2A4060',
        shadow: '#050D18',
        cardBg: '#132238',
        tabBarBg: '#070F1C',
        tabBarActive: '#4A9EFF',
    },
    forest_green: {
        background: '#0D1F0D',
        surface: '#142814',
        text: '#D4E8D4',
        textSecondary: '#7DAA7D',
        accent: '#39FF14',
        accentSecondary: '#FFD700',
        border: '#1E4D1E',
        shadow: '#061006',
        cardBg: '#142814',
        tabBarBg: '#081208',
        tabBarActive: '#39FF14',
    },
    sunset_orange: {
        background: '#1A0A05',
        surface: '#2A1410',
        text: '#FFE8DD',
        textSecondary: '#CC8866',
        accent: '#FF6B35',
        accentSecondary: '#FF90B3',
        border: '#5A2010',
        shadow: '#100505',
        cardBg: '#2A1410',
        tabBarBg: '#120808',
        tabBarActive: '#FF6B35',
    },
    neon_cyberpunk: {
        background: '#0A0A1A',
        surface: '#12122A',
        text: '#EAEAFF',
        textSecondary: '#8888CC',
        accent: '#FF007F',
        accentSecondary: '#00FFFF',
        border: '#FF007F',
        shadow: '#050510',
        cardBg: '#12122A',
        tabBarBg: '#080818',
        tabBarActive: '#FF007F',
    },
    royal_purple: {
        background: '#100820',
        surface: '#1A1030',
        text: '#E8D8FF',
        textSecondary: '#9978CC',
        accent: '#B366FF',
        accentSecondary: '#FFD700',
        border: '#4A2080',
        shadow: '#080410',
        cardBg: '#1A1030',
        tabBarBg: '#0A0618',
        tabBarActive: '#B366FF',
    },
    ocean_wave: {
        background: '#041420',
        surface: '#082030',
        text: '#D0E8F8',
        textSecondary: '#6098BB',
        accent: '#00BCD4',
        accentSecondary: '#26C6DA',
        border: '#0D3050',
        shadow: '#020A10',
        cardBg: '#082030',
        tabBarBg: '#031018',
        tabBarActive: '#00BCD4',
    },
    aurora_borealis: {
        background: '#050A18',
        surface: '#0A1428',
        text: '#E0F0FF',
        textSecondary: '#7090BB',
        accent: '#00E5FF',
        accentSecondary: '#76FF03',
        border: '#1A3060',
        shadow: '#030610',
        cardBg: '#0A1428',
        tabBarBg: '#040818',
        tabBarActive: '#00E5FF',
    },
};

// ============================================
// SHOP ITEMS
// ============================================
export const SHOP_ITEMS: ShopItem[] = [
    // ========== THEMES ==========
    { id: 'theme_midnight_blue', name: 'Midnight Blue', description: 'Deep blue + silver accents. Calm and focused.', category: 'themes', price: 200, icon: '🌙', unlockLevel: 1 },
    { id: 'theme_forest_green', name: 'Forest Green', description: 'Nature-inspired green palette for concentration.', category: 'themes', price: 200, icon: '🌲', unlockLevel: 1 },
    { id: 'theme_sunset_orange', name: 'Sunset Orange', description: 'Warm orange/pink gradients. Cozy and inviting.', category: 'themes', price: 300, icon: '🌅', unlockLevel: 3 },
    { id: 'theme_neon_cyberpunk', name: 'Neon Cyberpunk', description: 'Neon pink + cyan on dark. Electric energy.', category: 'themes', price: 500, icon: '🎮', unlockLevel: 6 },
    { id: 'theme_royal_purple', name: 'Royal Purple', description: 'Purple + gold luxury feel. Regal and premium.', category: 'themes', price: 500, icon: '👑', unlockLevel: 6 },
    { id: 'theme_ocean_wave', name: 'Ocean Wave', description: 'Animated water gradient. Cool and serene.', category: 'themes', price: 750, icon: '🌊', unlockLevel: 10 },
    { id: 'theme_aurora_borealis', name: 'Aurora Borealis', description: 'Dynamic color-shifting theme. Mesmerizing.', category: 'themes', price: 1000, icon: '🌌', unlockLevel: 14 },

    // ========== ALARM SOUNDS ==========
    { id: 'sound_zen_chimes', name: 'Zen Chimes', description: 'Calm temple bells for gentle awakening.', category: 'sounds', price: 100, icon: '🔔', unlockLevel: 1 },
    { id: 'sound_military_bugle', name: 'Military Bugle', description: 'Urgent wake up call. No snoozing allowed.', category: 'sounds', price: 200, icon: '📯', unlockLevel: 3 },
    { id: 'sound_gaming_victory', name: 'Gaming Victory', description: 'Achievement unlocked fanfare. Start winning.', category: 'sounds', price: 300, icon: '🏆', unlockLevel: 5 },
    { id: 'sound_nature_dawn', name: 'Nature Dawn', description: 'Birds + gentle sunrise. Wake up naturally.', category: 'sounds', price: 200, icon: '🐦', unlockLevel: 2 },
    { id: 'sound_space_alert', name: 'Space Alert', description: 'Sci-fi emergency klaxon. Maximum alertness.', category: 'sounds', price: 500, icon: '🚀', unlockLevel: 8 },

    // ========== AVATARS / FRAMES ==========
    { id: 'avatar_bronze_frame', name: 'Bronze Frame', description: 'Simple bronze border around your avatar.', category: 'avatars', price: 150, icon: '🥉', unlockLevel: 2 },
    { id: 'avatar_silver_frame', name: 'Silver Frame', description: 'Polished silver. Getting serious.', category: 'avatars', price: 300, icon: '🥈', unlockLevel: 5 },
    { id: 'avatar_gold_frame', name: 'Gold Frame', description: 'Premium gold. You earned it.', category: 'avatars', price: 500, icon: '🥇', unlockLevel: 8 },
    { id: 'avatar_diamond_frame', name: 'Diamond Frame', description: 'Sparkle diamond border. Ultra premium.', category: 'avatars', price: 800, icon: '💎', unlockLevel: 12 },
    { id: 'avatar_fire_frame', name: 'Fire Frame', description: 'Animated flame border. Blazing hot.', category: 'avatars', price: 600, icon: '🔥', unlockLevel: 10 },

    // ========== CUSTOM TITLES ==========
    { id: 'title_sigma_grinder', name: 'Sigma Grinder', description: 'Override your rank title with "Sigma Grinder".', category: 'titles', price: 300, icon: '💪', unlockLevel: 3 },
    { id: 'title_sleep_overrated', name: 'Sleep Is Overrated', description: 'Who needs sleep when you have goals?', category: 'titles', price: 500, icon: '😤', unlockLevel: 5 },
    { id: 'title_ceo_focus', name: 'CEO of Focus', description: 'Executive-level concentration.', category: 'titles', price: 750, icon: '🏢', unlockLevel: 8 },
    { id: 'title_touch_grass', name: 'Touch Grass Expert', description: 'Ironic for someone who stares at screens.', category: 'titles', price: 500, icon: '🌿', unlockLevel: 4 },
    { id: 'title_built_different', name: 'Built Different', description: 'Not like the other productivity apps.', category: 'titles', price: 1000, icon: '🏗️', unlockLevel: 10 },
    { id: 'title_galaxy_brain', name: 'Galaxy Brain', description: 'Transcendent intelligence unlocked.', category: 'titles', price: 1500, icon: '🧠', unlockLevel: 15 },

    // ========== POWER-UPS ==========
    { id: 'powerup_double_xp', name: 'Double XP', description: '2x points earned for 24 hours.', category: 'powerups', price: 200, icon: '⚡', unlockLevel: 3 },
    { id: 'powerup_streak_shield', name: 'Streak Shield', description: 'Protect your streak if you miss one day.', category: 'powerups', price: 500, icon: '🛡️', unlockLevel: 7 },
    { id: 'powerup_point_magnet', name: 'Point Magnet', description: '+50% bonus points for 24 hours.', category: 'powerups', price: 300, icon: '🧲', unlockLevel: 5 },
];

// Category metadata for UI
export const SHOP_CATEGORIES: { key: ShopCategory; label: string; icon: string }[] = [
    { key: 'themes', label: 'Themes', icon: '🎨' },
    { key: 'sounds', label: 'Sounds', icon: '🔔' },
    { key: 'avatars', label: 'Avatars', icon: '🖼️' },
    { key: 'titles', label: 'Titles', icon: '🏷️' },
    { key: 'powerups', label: 'Power-ups', icon: '⚡' },
];

export function getItemsByCategory(category: ShopCategory): ShopItem[] {
    return SHOP_ITEMS.filter(item => item.category === category);
}

export function getThemeById(themeId: string): ThemeColors {
    const key = themeId.replace('theme_', '');
    return THEME_COLORS[key] || THEME_COLORS['default'];
}

export default SHOP_ITEMS;
