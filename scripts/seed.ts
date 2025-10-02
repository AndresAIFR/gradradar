import { db } from "../server/db";
import { users, students, sessionNotes, homework, resources, studyMetrics } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create a demo tutor user
    console.log("Creating demo tutor user...");
    await db.insert(users).values({
      id: "demo-tutor-123",
      email: "tutor@example.com",
      firstName: "John",
      lastName: "Doe",
      role: "tutor",
      profileImageUrl: null,
    }).onConflictDoNothing();

    // Create demo students
    console.log("Creating demo students...");
    const [student1] = await db.insert(students).values({
      name: "Emma Smith",
      pronouns: "she/her",
      email: "emma.smith@email.com",
      phone: "(555) 123-4567",
      school: "Jefferson High School",
      ageGrade: "Grade 11",
      examType: "SAT",
      targetScore: 1500,
      lastMockScore: 1420,
      nextMockDate: "2024-12-02",
      officialTestDate: "2025-03-15",
      targetColleges: ["UC Berkeley", "UCLA", "Stanford"],
      weaknesses: ["Math - Algebra", "Reading - Time Management"],
    }).returning();

    const [student2] = await db.insert(students).values({
      name: "Michael Johnson",
      pronouns: "he/him",
      email: "michael.johnson@email.com",
      phone: "(555) 987-6543",
      school: "Lincoln Academy",
      ageGrade: "Grade 12",
      examType: "ACT",
      targetScore: 32,
      lastMockScore: 28,
      nextMockDate: "2024-11-15",
      officialTestDate: "2025-02-10",
      targetColleges: ["Northwestern", "University of Chicago", "Notre Dame"],
      weaknesses: ["Science - Chemistry", "English - Grammar"],
    }).returning();

    console.log("Creating demo session notes...");
    // Add session notes for Emma
    await db.insert(sessionNotes).values([
      {
        studentId: student1.id,
        date: "2024-11-01",
        durationMin: 90,
        noteMd: `# Quadratic Equations Session

Focused on quadratic equations and factoring. Emma showed significant improvement in identifying factoring patterns. Completed 8 practice problems with 75% accuracy.

**Areas of strength:**
- Basic algebraic manipulation
- Substitution methods

**Areas for improvement:**
- Complex factoring patterns
- Word problems involving quadratics

**Homework assigned:**
- Practice worksheet on factoring trinomials (pages 45-47)
- Khan Academy: Quadratic word problems`,
        tags: ["Math", "Algebra", "Quadratics"],
        visibleStudent: false,
        visibleParent: true,
      },
      {
        studentId: student1.id,
        date: "2024-10-28",
        durationMin: 60,
        noteMd: `# Reading Comprehension Session

Worked on reading comprehension strategies and time management. Practiced with two passage sets from recent SAT exams.

**Progress:**
- Improved active reading techniques
- Better annotation strategies
- Still working on timing (currently taking 15 min per passage, target is 13 min)

**Next session focus:**
- Speed reading techniques
- Process of elimination strategies`,
        tags: ["Reading", "Comprehension", "Timing"],
        visibleStudent: true,
        visibleParent: true,
      },
    ]);

    // Add session notes for Michael
    await db.insert(sessionNotes).values([
      {
        studentId: student2.id,
        date: "2024-10-30",
        durationMin: 75,
        noteMd: `# Science Section Review

Reviewed chemistry concepts and scientific reasoning. Michael struggles with balancing chemical equations but shows good understanding of scientific method.

**Covered topics:**
- Balancing chemical equations
- Stoichiometry basics
- Scientific reasoning passages

**Homework:**
- Complete chemistry practice set
- Review periodic table trends`,
        tags: ["Science", "Chemistry", "ACT"],
        visibleStudent: false,
        visibleParent: true,
      },
    ]);

    console.log("Creating demo homework assignments...");
    // Add homework for both students
    await db.insert(homework).values([
      {
        studentId: student1.id,
        assignedDate: "2024-11-01",
        dueDate: "2024-11-05",
        description: "Quadratic Equations Practice Worksheet",
        link: "https://example.com/quadratic-worksheet",
        status: "done",
        autoReminder: true,
      },
      {
        studentId: student1.id,
        assignedDate: "2024-11-03",
        dueDate: "2024-11-08",
        description: "Reading Comprehension - Passages 1-3",
        link: "https://example.com/reading-practice",
        status: "progress",
        autoReminder: false,
      },
      {
        studentId: student2.id,
        assignedDate: "2024-10-30",
        dueDate: "2024-11-06",
        description: "Chemistry Practice Set - Balancing Equations",
        status: "new",
        autoReminder: true,
      },
    ]);

    console.log("Creating demo resources...");
    // Add resources
    await db.insert(resources).values([
      {
        studentId: student1.id,
        title: "Khan Academy - Algebra",
        link: "https://www.khanacademy.org/math/algebra",
        notes: "Interactive lessons on quadratic equations and factoring",
      },
      {
        studentId: student1.id,
        title: "SAT Practice Test 1",
        link: "https://collegeboard.org/sat-practice-test-1",
        notes: "Official College Board practice test for baseline assessment",
      },
      {
        studentId: student2.id,
        title: "ACT Science Practice",
        link: "https://example.com/act-science",
        notes: "Additional practice problems for scientific reasoning",
      },
    ]);

    console.log("Creating demo study metrics...");
    // Add study metrics
    await db.insert(studyMetrics).values([
      {
        studentId: student1.id,
        date: "2024-10-28",
        activityType: "Practice Test",
        minutesSpent: 180,
        score: 1420,
      },
      {
        studentId: student1.id,
        date: "2024-10-30",
        activityType: "Homework",
        minutesSpent: 60,
      },
      {
        studentId: student2.id,
        date: "2024-10-29",
        activityType: "Practice Test",
        minutesSpent: 120,
        score: 28,
      },
    ]);

    console.log("✅ Database seeded successfully!");
    console.log("\n📊 Demo Data Created:");
    console.log("- Demo tutor user: tutor@example.com");
    console.log("- 2 students: Emma Smith (SAT) and Michael Johnson (ACT)");
    console.log("- Session notes with detailed progress tracking");
    console.log("- Homework assignments in various states");
    console.log("- Learning resources and study metrics");
    console.log("\n🌐 Access the app at: http://localhost:5000");
    console.log("📚 Student pages:");
    console.log(`- Emma Smith: http://localhost:5000/student/${student1.id}`);
    console.log(`- Michael Johnson: http://localhost:5000/student/${student2.id}`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed().catch(console.error);
