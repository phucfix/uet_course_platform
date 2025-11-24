import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Tạo khóa học CS50x
  const cs50x = await prisma.course.upsert({
    where: { slug: 'cs50x' },
    update: {},
    create: {
      title: 'CS50x: Introduction to Computer Science',
      description: 'An introduction to the intellectual enterprises of computer science and the art of programming.',
      slug: 'cs50x',
    },
  });

  // Tạo các tuần cho CS50x
  const cs50xWeeks = [
    { weekNumber: 0, title: 'Scratch', description: 'Introduction to programming with Scratch' },
    { weekNumber: 1, title: 'C', description: 'Learn C programming basics' },
    { weekNumber: 2, title: 'Arrays', description: 'Working with arrays and strings' },
    { weekNumber: 3, title: 'Algorithms', description: 'Sorting and searching algorithms' },
    { weekNumber: 4, title: 'Memory', description: 'Pointers and memory management' },
    { weekNumber: 5, title: 'Data Structures', description: 'Linked lists, trees, hash tables' },
    { weekNumber: 6, title: 'Python', description: 'Introduction to Python programming' },
    { weekNumber: 7, title: 'SQL', description: 'Databases and SQL' },
    { weekNumber: 8, title: 'HTML, CSS, JavaScript', description: 'Web programming basics' },
    { weekNumber: 9, title: 'Flask', description: 'Web applications with Flask' },
  ];

  for (const week of cs50xWeeks) {
    await prisma.week.upsert({
      where: {
        courseId_weekNumber: {
          courseId: cs50x.id,
          weekNumber: week.weekNumber,
        },
      },
      update: {},
      create: {
        courseId: cs50x.id,
        ...week,
      },
    });
  }

  // Tạo khóa học Web Development
  const webDev = await prisma.course.upsert({
    where: { slug: 'web-dev' },
    update: {},
    create: {
      title: 'Full Stack Web Development',
      description: 'Learn to build modern web applications from scratch',
      slug: 'web-dev',
    },
  });

  const webDevWeeks = [
    { weekNumber: 1, title: 'HTML & CSS Basics', description: 'Structure and style web pages' },
    { weekNumber: 2, title: 'JavaScript Fundamentals', description: 'Programming for the web' },
    { weekNumber: 3, title: 'React', description: 'Build user interfaces with React' },
    { weekNumber: 4, title: 'Node.js & Express', description: 'Backend development' },
    { weekNumber: 5, title: 'Databases', description: 'Working with databases' },
    { weekNumber: 6, title: 'Authentication', description: 'User authentication and security' },
  ];

  for (const week of webDevWeeks) {
    await prisma.week.upsert({
      where: {
        courseId_weekNumber: {
          courseId: webDev.id,
          weekNumber: week.weekNumber,
        },
      },
      update: {},
      create: {
        courseId: webDev.id,
        ...week,
      },
    });
  }

  // Tạo khóa Data Science
  const dataScience = await prisma.course.upsert({
    where: { slug: 'data-science' },
    update: {},
    create: {
      title: 'Data Science with Python',
      description: 'Learn data analysis, visualization, and machine learning',
      slug: 'data-science',
    },
  });

  const dataScienceWeeks = [
    { weekNumber: 1, title: 'Python Basics', description: 'Python programming fundamentals' },
    { weekNumber: 2, title: 'NumPy & Pandas', description: 'Data manipulation libraries' },
    { weekNumber: 3, title: 'Data Visualization', description: 'Matplotlib and Seaborn' },
    { weekNumber: 4, title: 'Statistics', description: 'Statistical analysis basics' },
    { weekNumber: 5, title: 'Machine Learning', description: 'Introduction to ML with scikit-learn' },
  ];

  for (const week of dataScienceWeeks) {
    await prisma.week.upsert({
      where: {
        courseId_weekNumber: {
          courseId: dataScience.id,
          weekNumber: week.weekNumber,
        },
      },
      update: {},
      create: {
        courseId: dataScience.id,
        ...week,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });