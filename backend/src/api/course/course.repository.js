import { pool } from "../../config/postgres/postgres.db.js";

const COURSE_COLUMNS = `
  id, tutor_id, title, instructor, category, level, description, image,
  visibility, course_code, base_students, created_at
`;

export const courseRepository = {
  /**
   * Todos los cursos + conteo real de inscritos (enrollments) + si el usuario
   * actual está inscrito (para poder marcar "Joined" sin una query aparte).
   */
  findAllWithStats: async (userId) => {
    const { rows } = await pool.query(
      `SELECT c.*,
              (c.base_students + COUNT(e.id))::int AS students,
              BOOL_OR(e.student_id = $1) AS is_enrolled
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC;`,
      [userId || 0]
    );
    return rows;
  },

  findByTutor: async (tutorId) => {
    const { rows } = await pool.query(
      `SELECT c.*, (c.base_students + COUNT(e.id))::int AS students
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       WHERE c.tutor_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC;`,
      [tutorId]
    );
    return rows;
  },

  findById: async (id) => {
    const { rows } = await pool.query(`SELECT ${COURSE_COLUMNS} FROM courses WHERE id = $1;`, [id]);
    return rows[0] || null;
  },

  findByCode: async (code) => {
    const { rows } = await pool.query(`SELECT ${COURSE_COLUMNS} FROM courses WHERE course_code = $1;`, [code]);
    return rows[0] || null;
  },

  create: async ({ tutor_id, title, instructor, category, level, description, image, visibility, course_code }) => {
    const { rows } = await pool.query(
      `INSERT INTO courses (tutor_id, title, instructor, category, level, description, image, visibility, course_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${COURSE_COLUMNS};`,
      [tutor_id, title, instructor, category, level || "Beginner", description, image, visibility || "open", course_code]
    );
    return rows[0];
  },

  update: async (id, fields) => {
    const { title, instructor, category, level, description, image, visibility, course_code } = fields;
    const { rows } = await pool.query(
      `UPDATE courses
       SET title = $1, instructor = $2, category = $3, level = $4, description = $5,
           image = $6, visibility = $7, course_code = $8
       WHERE id = $9
       RETURNING ${COURSE_COLUMNS};`,
      [title, instructor, category, level, description, image, visibility, course_code, id]
    );
    return rows[0] || null;
  },

  // Stats globales de los cursos de un tutor (para su dashboard)
  statsForTutor: async (tutorId) => {
    const { rows } = await pool.query(
      `SELECT
         COUNT(DISTINCT c.id)::int AS total_courses,
         COALESCE(SUM(c.base_students), 0)::int + COUNT(e.id)::int AS total_students,
         COUNT(DISTINCT s.id)::int AS total_sections
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
       LEFT JOIN sections s ON s.course_id = c.id
       WHERE c.tutor_id = $1;`,
      [tutorId]
    );
    return rows[0];
  },
};
