export type Language = 'en' | 'zh';

export const TRANSLATIONS = {
  en: {
    // Auth & Actions
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.logout": "Logout",
    "auth.welcome": "Welcome",
    "auth.noAccount": "No account?",
    "auth.haveAccount": "Have account?",
    "header.save": "Save",
    "header.download": "Download",
    "header.upload": "Upload",
    "header.saved": "Saved!",

    // Header
    "header.characterName": "Character Name",
    "header.classLevel": "Class & Level",
    "header.subclass": "Subclass",
    "header.background": "Background",
    "header.playerName": "Player Name",
    "header.race": "Race",
    "header.subrace": "Subrace",
    "header.alignment": "Alignment",
    "header.expPoints": "Experience Points",
    "header.bodyType": "Body Type",
    
    // Stats / Vitals
    "stats.inspiration": "Inspiration",
    "stats.proficiency": "Proficiency",
    "stats.passivePerception": "Passive Perception",
    "stats.score": "Score",
    "stats.savingThrows": "Saving Throws",
    
    "vitals.ac": "Armor Class",
    "vitals.acBase": "Base",
    "vitals.acBonus": "Bonus",
    "vitals.initiative": "Initiative",
    "vitals.speed": "Speed",
    "vitals.hp": "Hit Points",
    "vitals.hpMax": "Max",
    "vitals.hpCurrent": "Current",
    "vitals.hpTemp": "Temporary HP",
    "vitals.hitDice": "Hit Dice",
    "vitals.total": "Total",
    "vitals.used": "Used",
    "vitals.deathSaves": "Death Saves",
    "vitals.success": "Succ",
    "vitals.failures": "Fail",

    // Attacks
    "attacks.title": "Attacks & Spellcasting",
    "attacks.name": "Name",
    "attacks.bonus": "Atk Bonus",
    "attacks.damage": "Damage",
    "attacks.type": "Type",
    "attacks.notes": "Notes",
    "attacks.add": "+ Add Attack Row",

    // Equipment
    "equipment.title": "Equipment",
    "equipment.concentrating": "Concentrating",
    "equipment.conditions": "Conditions",
    "equipment.currency": "Currency",
    "equipment.cp": "CP",
    "equipment.sp": "SP",
    "equipment.ep": "EP",
    "equipment.gp": "GP",
    "equipment.pp": "PP",
    "equipment.otherNotes": "Other Notes",

    // Personality
    "personality.traits": "Personality Traits",
    "personality.ideals": "Ideals",
    "personality.bonds": "Bonds",
    "personality.flaws": "Flaws",

    // Features
    "features.title": "Features & Traits",
    "features.placeholder": "Class features, racial traits, feats...",

    // Proficiencies
    "profs.title": "Proficiencies & Languages",
    "profs.armor": "Armor",
    "profs.weapons": "Weapons",
    "profs.tools": "Tools",
    "profs.languages": "Languages",
    "profs.other": "Other",

    // Backstory
    "backstory.title": "Backstory",
    "backstory.generate": "AI Generate",
    "backstory.thinking": "Thinking...",
    "backstory.placeholder": "Character backstory...",

    // Spells
    "spells.class": "Spellcasting Class",
    "spells.ability": "Spellcasting Ability",
    "spells.saveDC": "Spell Save DC",
    "spells.attackBonus": "Spell Attack Bonus",
    "spells.level": "Level",
    "spells.cantrips": "Cantrips",
    "spells.slotsTotal": "Slots Total",
    "spells.slotsExpended": "Expended",
    "spells.prep": "Prep",
    "spells.name": "Spell Name",
    "spells.time": "Time",
    "spells.range": "Range",
    "spells.comp": "Comp",
    "spells.duration": "Duration",
    "spells.concentration": "C",
    "spells.ritual": "R",
    "spells.add": "+ Add Spell",

    // Footer
    "footer.text": "EulCau D&D 5e auto card. Not affiliated with Wizards of the Coast.",

    // Skills
    "skills.Acrobatics": "Acrobatics",
    "skills.Animal Handling": "Animal Handling",
    "skills.Arcana": "Arcana",
    "skills.Athletics": "Athletics",
    "skills.Deception": "Deception",
    "skills.History": "History",
    "skills.Insight": "Insight",
    "skills.Intimidation": "Intimidation",
    "skills.Investigation": "Investigation",
    "skills.Medicine": "Medicine",
    "skills.Nature": "Nature",
    "skills.Perception": "Perception",
    "skills.Performance": "Performance",
    "skills.Persuasion": "Persuasion",
    "skills.Religion": "Religion",
    "skills.Sleight of Hand": "Sleight of Hand",
    "skills.Stealth": "Stealth",
    "skills.Survival": "Survival",

    // Classes
    "class.Barbarian": "Barbarian",
    "class.Bard": "Bard",
    "class.Cleric": "Cleric",
    "class.Druid": "Druid",
    "class.Fighter": "Fighter",
    "class.Monk": "Monk",
    "class.Paladin": "Paladin",
    "class.Ranger": "Ranger",
    "class.Rogue": "Rogue",
    "class.Sorcerer": "Sorcerer",
    "class.Warlock": "Warlock",
    "class.Wizard": "Wizard",

    // Alignments
    "alignment.Lawful Good": "Lawful Good",
    "alignment.Neutral Good": "Neutral Good",
    "alignment.Chaotic Good": "Chaotic Good",
    "alignment.Lawful Neutral": "Lawful Neutral",
    "alignment.True Neutral": "True Neutral",
    "alignment.Chaotic Neutral": "Chaotic Neutral",
    "alignment.Lawful Evil": "Lawful Evil",
    "alignment.Neutral Evil": "Neutral Evil",
    "alignment.Chaotic Evil": "Chaotic Evil"
  },
  zh: {
    // Auth & Actions
    "auth.login": "登录",
    "auth.register": "注册",
    "auth.username": "用户名",
    "auth.password": "密码",
    "auth.logout": "登出",
    "auth.welcome": "欢迎",
    "auth.noAccount": "没有账号?",
    "auth.haveAccount": "已有账号?",
    "header.save": "保存",
    "header.download": "下载",
    "header.upload": "上传",
    "header.saved": "已保存!",

    // Header
    "header.characterName": "角色名称",
    "header.classLevel": "职业 & 等级",
    "header.subclass": "子职业",
    "header.background": "背景",
    "header.playerName": "玩家姓名",
    "header.race": "种族",
    "header.subrace": "亚种",
    "header.alignment": "阵营",
    "header.expPoints": "经验值",
    "header.bodyType": "体型",
    
    // Stats / Vitals
    "stats.inspiration": "激励",
    "stats.proficiency": "熟练度",
    "stats.passivePerception": "被动察觉",
    "stats.score": "属性值",
    "stats.savingThrows": "豁免检定",
    
    "vitals.ac": "护甲等级",
    "vitals.acBase": "基础",
    "vitals.acBonus": "加值",
    "vitals.initiative": "先攻",
    "vitals.speed": "速度",
    "vitals.hp": "生命值",
    "vitals.hpMax": "最大",
    "vitals.hpCurrent": "当前",
    "vitals.hpTemp": "临时生命",
    "vitals.hitDice": "生命骰",
    "vitals.total": "总计",
    "vitals.used": "已用",
    "vitals.deathSaves": "死亡豁免",
    "vitals.success": "成功",
    "vitals.failures": "失败",

    // Attacks
    "attacks.title": "攻击 & 施法",
    "attacks.name": "名称",
    "attacks.bonus": "攻击加值",
    "attacks.damage": "伤害",
    "attacks.type": "类型",
    "attacks.notes": "备注",
    "attacks.add": "+ 添加攻击",

    // Equipment
    "equipment.title": "装备",
    "equipment.concentrating": "专注中",
    "equipment.conditions": "状态",
    "equipment.currency": "货币",
    "equipment.cp": "铜",
    "equipment.sp": "银",
    "equipment.ep": "厄",
    "equipment.gp": "金",
    "equipment.pp": "铂",
    "equipment.otherNotes": "其他笔记",

    // Personality
    "personality.traits": "个性特征",
    "personality.ideals": "理想",
    "personality.bonds": "牵挂",
    "personality.flaws": "缺点",

    // Features
    "features.title": "特性 & 专长",
    "features.placeholder": "职业特性, 种族特质, 专长...",

    // Proficiencies
    "profs.title": "熟练项 & 语言",
    "profs.armor": "护甲",
    "profs.weapons": "武器",
    "profs.tools": "工具",
    "profs.languages": "语言",
    "profs.other": "其他",

    // Backstory
    "backstory.title": "背景故事",
    "backstory.generate": "AI 生成",
    "backstory.thinking": "思考中...",
    "backstory.placeholder": "角色背景故事...",

    // Spells
    "spells.class": "施法职业",
    "spells.ability": "关键属性",
    "spells.saveDC": "豁免 DC",
    "spells.attackBonus": "攻击加值",
    "spells.level": "环阶",
    "spells.cantrips": "戏法",
    "spells.slotsTotal": "总法术位",
    "spells.slotsExpended": "已消耗",
    "spells.prep": "准备",
    "spells.name": "法术名称",
    "spells.time": "时间",
    "spells.range": "距离",
    "spells.comp": "构材",
    "spells.duration": "持续时间",
    "spells.concentration": "专注",
    "spells.ritual": "仪式",
    "spells.add": "+ 添加法术",

    // Footer
    "footer.text": "EulCau D&D 5e auto card。与威世智无关。",

    // Skills
    "skills.Acrobatics": "体操",
    "skills.Animal Handling": "驯兽",
    "skills.Arcana": "奥秘",
    "skills.Athletics": "运动",
    "skills.Deception": "欺瞒",
    "skills.History": "历史",
    "skills.Insight": "洞悉",
    "skills.Intimidation": "威吓",
    "skills.Investigation": "调查",
    "skills.Medicine": "医药",
    "skills.Nature": "自然",
    "skills.Perception": "察觉",
    "skills.Performance": "表演",
    "skills.Persuasion": "说服",
    "skills.Religion": "宗教",
    "skills.Sleight of Hand": "巧手",
    "skills.Stealth": "隐匿",
    "skills.Survival": "求生",

    // Classes
    "class.Barbarian": "野蛮人",
    "class.Bard": "吟游诗人",
    "class.Cleric": "牧师",
    "class.Druid": "德鲁伊",
    "class.Fighter": "战士",
    "class.Monk": "武僧",
    "class.Paladin": "圣武士",
    "class.Ranger": "游侠",
    "class.Rogue": "游荡者",
    "class.Sorcerer": "术士",
    "class.Warlock": "邪术师",
    "class.Wizard": "法师",

    // Alignments
    "alignment.Lawful Good": "守序善良",
    "alignment.Neutral Good": "中立善良",
    "alignment.Chaotic Good": "混乱善良",
    "alignment.Lawful Neutral": "守序中立",
    "alignment.True Neutral": "绝对中立",
    "alignment.Chaotic Neutral": "混乱中立",
    "alignment.Lawful Evil": "守序邪恶",
    "alignment.Neutral Evil": "中立邪恶",
    "alignment.Chaotic Evil": "混乱邪恶"
  }
};