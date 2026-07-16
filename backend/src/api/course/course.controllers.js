/**
 * 1. GET /api/courses — Get all the courses (Task for Manuel)
 * Handled under Blocker #2: Filters visible open listings
 */
export const getCourses = async (req, res, next) => {
  try {
    // TODO: Manuel will implement courseRepository.findAll derived logic here
    return res.status(200).json([]); // Returns empty array to match the contract
  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/courses — Create a course (Task for Manuel)
 * Blocker #2 & #3: Exclusive for 'tutor' role. Generates course_code if private.
 */
export const createCourse = async (req, res, next) => {
  try {
    const tutorIdFromToken = req.user.id; // Injected by verifyJWT
    
    // TODO: Manuel will implement courseRepository.insert here using tutorIdFromToken
    return res.status(201).json({ 
      ok: true, 
      message: "Skeleton route active. Ready for DB logic mapping.",
      tutor_id: tutorIdFromToken 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. PUT /api/courses/:id — Update a course (Task for Manuel)
 * Blocker #2: Validates that the authenticated tutor owns the record.
 * Blocker #3: Enforces immutable course_code constraints.
 */
export const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tutorIdFromToken = req.user.id; // Injected by verifyJWT

    // NOTE FOR MANUEL: 
    // You must fetch the course from DB first using 'id' to execute ownership validation.
    // example: const course = await courseRepository.findById(id);
    
    // TEMPORARY PROXY CHECK (Skeleton mockup to prevent system crashes)
    const mockTutorIdFromDB = 2; // Simulating the actual owner id from database record

    // 🔒 BLOCKER #2: Enforce strict server-side ownership authorization
    if (mockTutorIdFromDB !== tutorIdFromToken) {
      return res.status(403).json({ 
        ok: false, 
        message: "Forbidden: You cannot modify a course that does not belong to you." 
      });
    }

    // TODO: Manuel will implement immutable code validation and courseRepository.update here
    return res.status(200).json({ 
      ok: true, 
      message: `Course ${id} skeleton update cleared authorization filter.` 
    });
  } catch (error) {
    next(error);
  }
};