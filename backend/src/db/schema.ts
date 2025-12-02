import { pgTable, serial, text, integer, unique, index, pgEnum, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --------------------------------------------------------
// Enum定義
// --------------------------------------------------------
export const userRoleEnum = pgEnum('user_role', ['admin', 'general']); // admin: 管理者, general: 一般教員
export const subjectCategoryEnum = pgEnum('subject_category', ['S', 'O']); // 分野: 専/他
export const classTypeEnum = pgEnum('class_type', ['Lecture', 'Exercise']); // 形式: 講/演

// --------------------------------------------------------
// 1. ユーザーマスタ (Users) - ログイン用
// --------------------------------------------------------
// システムにログインできるユーザー
// general権限のユーザーは teacherId を持ち、対応する教員として成績入力可能
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').notNull().unique(),
    name: text('name').notNull(), // 表示名
    password: text('password').notNull(), // ハッシュ化されたパスワード
    role: userRoleEnum('role').default('general').notNull(),

    // general権限ユーザーの場合、どの教員と紐付くか（admin は null）
    teacherId: integer('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
});

// --------------------------------------------------------
// 2. 教員マスタ (Teachers) - 指導教員情報
// --------------------------------------------------------
// ログインとは無関係な、教員の基本情報
export const teachers = pgTable('teachers', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'), // 任意（連絡先として）
});

// --------------------------------------------------------
// 3. クラス/組マスタ (Groups)
// --------------------------------------------------------
export const groups = pgTable('groups', {
    id: serial('id').primaryKey(),
    year: integer('year').notNull(),
    name: text('name').notNull(), // "25K" など
}, (t) => ({
    unq: unique().on(t.year, t.name),
}));

// --------------------------------------------------------
// 4. 学生マスタ (Students)
// --------------------------------------------------------
export const students = pgTable('students', {
    id: serial('id').primaryKey(),
    studentCode: text('student_code').notNull().unique(),
    name: text('name').notNull(),
    groupId: integer('group_id')
        .references(() => groups.id, { onDelete: 'set null' }),
});

// --------------------------------------------------------
// 5. 科目マスタ (Subjects)
// --------------------------------------------------------
export const subjects = pgTable('subjects', {
    id: serial('id').primaryKey(),
    year: integer('year').notNull(),
    name: text('name').notNull(),

    category: subjectCategoryEnum('category').notNull(),
    classType: classTypeEnum('class_type').notNull(),
    credits: integer('credits').notNull(),

    groupId: integer('group_id')
        .references(() => groups.id, { onDelete: 'restrict' })
        .notNull(),

    // データ登録担当の教員（teachersテーブルを参照）
    // この教員に紐付くuserが成績入力可能
    registrarId: integer('registrar_id')
        .references(() => teachers.id, { onDelete: 'restrict' })
        .notNull(),

    accessPin: text('access_pin').notNull(), // 4桁暗証番号
}, (t) => ({
    yearIdx: index('subjects_year_idx').on(t.year),
}));

// --------------------------------------------------------
// 6. 科目担当教員 (SubjectInstructors)
// --------------------------------------------------------
// 1つの科目に対し複数の教員を紐付ける中間テーブル
export const subjectInstructors = pgTable('subject_instructors', {
    subjectId: integer('subject_id')
        .references(() => subjects.id, { onDelete: 'cascade' })
        .notNull(),
    teacherId: integer('teacher_id')
        .references(() => teachers.id, { onDelete: 'cascade' })
        .notNull(),
}, (t) => ({
    pk: primaryKey({ columns: [t.subjectId, t.teacherId] }),
}));

// --------------------------------------------------------
// 7. 履修・成績データ (Enrollments)
// --------------------------------------------------------
export const enrollments = pgTable('enrollments', {
    id: serial('id').primaryKey(),
    studentId: integer('student_id')
        .references(() => students.id, { onDelete: 'cascade' })
        .notNull(),
    subjectId: integer('subject_id')
        .references(() => subjects.id, { onDelete: 'cascade' })
        .notNull(),

    scoreFirstSemester: integer('score_1st'), // null = 未入力
    scoreSecondSemester: integer('score_2nd'), // null = 未入力
    absenceCount: integer('absence_count').default(0).notNull(),
}, (t) => ({
    unq: unique().on(t.studentId, t.subjectId),
}));

// --------------------------------------------------------
// リレーション定義
// --------------------------------------------------------
export const usersRelations = relations(users, ({ one }) => ({
    teacher: one(teachers, {
        fields: [users.teacherId],
        references: [teachers.id],
    }),
}));

export const teachersRelations = relations(teachers, ({ many }) => ({
    users: many(users), // この教員に紐付くログインユーザー
    registeredSubjects: many(subjects), // 登録担当科目
    instructingSubjects: many(subjectInstructors), // 授業担当科目
}));

export const groupsRelations = relations(groups, ({ many }) => ({
    students: many(students),
    subjects: many(subjects),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
    group: one(groups, {
        fields: [students.groupId],
        references: [groups.id],
    }),
    enrollments: many(enrollments),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
    group: one(groups, {
        fields: [subjects.groupId],
        references: [groups.id],
    }),
    registrar: one(teachers, {
        fields: [subjects.registrarId],
        references: [teachers.id],
    }),
    instructors: many(subjectInstructors),
    enrollments: many(enrollments),
}));

export const subjectInstructorsRelations = relations(subjectInstructors, ({ one }) => ({
    subject: one(subjects, {
        fields: [subjectInstructors.subjectId],
        references: [subjects.id],
    }),
    teacher: one(teachers, {
        fields: [subjectInstructors.teacherId],
        references: [teachers.id],
    }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
    student: one(students, {
        fields: [enrollments.studentId],
        references: [students.id],
    }),
    subject: one(subjects, {
        fields: [enrollments.subjectId],
        references: [subjects.id],
    }),
}));