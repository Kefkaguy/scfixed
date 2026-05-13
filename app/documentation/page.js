import StaticContentPage from "@/components/StaticContentPage";

const sections = [
  {
    title: "Overview",
    icon: "*",
    content: [
      {
        heading: "What This Website Is",
        paragraphs: [
          "Digital Art Battle is a classroom-focused web app that combines a fighting-game-style character select experience with class management, student uploads, and teacher showcase controls.",
          "The current version centers the experience around a single main dashboard, with active class context driving uploads, class showcases, and the arena picker.",
        ],
      },
    ],
  },
  {
    title: "User Roles",
    icon: "+",
    content: [
      {
        heading: "Student",
        bullets: [
          "Uploads from the home page without an account",
          "Provides student name, optional email, period, and class code only when submitting work",
          "Can test uploads without submitting them to the teacher approval queue",
          "Can view approved showcase content",
        ],
      },
      {
        heading: "Teacher",
        bullets: [
          "Creates classes and controls class size",
          "Activates a class for the current browsing context",
          "Views uploaded class content",
          "Uses My Gallery from the teacher dashboard to manage teacher-created fighters and arenas separately from any one class",
          "Can make teacher-created fighters and arenas visible in one class or across all classes",
          "Uses a joined-students roster inside class content",
          "Can remove students from a class when moderation is needed",
          "Locks or unlocks classes",
          "Uses the dashboard as the main teacher control room",
        ],
      },
      {
        heading: "Role Assignment",
        paragraphs: [
          "Teacher accounts are created manually by the site owner. There is no public teacher signup route.",
        ],
      },
    ],
  },
  {
    title: "Main Pages",
    icon: ">",
    content: [
      {
        heading: "Home Dashboard",
        bullets: [
          "Route: /",
          "Main landing page for both students and teachers",
          "Shows role-aware controls, active class information, and user-specific actions",
        ],
      },
      {
        heading: "Arena Picker",
        bullets: [
          "Route: /arena",
          "Contains the mode select, level select, and character draft flow",
          "Loads the built-in roster together with class-aware custom fighter content for the active class",
          "The current picker behavior is centered on 1v1 selection",
        ],
      },
      {
        heading: "Class Content Manager",
        bullets: [
          "Route: /custom-characters",
          "Used for class showcase browsing and content management",
          "Teachers can switch between fighters, arenas, and students",
          "Student rows can show profile image, email, and upload completion state",
          "Can be opened in editable mode or read-only showcase mode depending on context",
        ],
      },
      {
        heading: "Teacher Gallery",
        bullets: [
          "Opened from the teacher dashboard using the My Gallery action",
          "Shows teacher-created fighters and arenas as a separate management view",
          "Supports filtering between all teacher assets, only fighters, and only arenas",
          "New teacher assets can target one class or all classes",
        ],
      },
      {
        heading: "Reference Pages",
        bullets: [
          "Route: /versionnotes for release history",
          "Route: /privacy-policy for privacy details",
          "Route: /documentation for this full documentation page",
        ],
      },
    ],
  },
  {
    title: "Student Workflow",
    icon: "#",
    content: [
      {
        heading: "Typical Student Flow",
        bullets: [
          "Open the home page",
          "Create or test a fighter or arena upload",
          "Submit work with a class code, student name, optional email, and period",
          "Wait for teacher approval",
          "View approved showcase content",
        ],
      },
    ],
  },
  {
    title: "Teacher Workflow",
    icon: "=",
    content: [
      {
        heading: "Typical Teacher Flow",
        bullets: [
          "Log in with a manually created teacher username and password",
          "Change the temporary password if prompted",
          "Create classes and distribute join codes",
          "Monitor upload counts and class participation from the home dashboard",
          "Open My Gallery from the dashboard to manage teacher-owned fighters and arenas",
          "Choose whether teacher-owned uploads appear in one class or all classes",
          "Set a class active",
          "Open that class's showcase content",
          "Review joined students with names, emails, avatars, and completion status",
          "Remove students from the class roster when needed",
          "Jump to the arena picker with the correct class already selected",
        ],
      },
    ],
  },
  {
    title: "Uploads And Rules",
    icon: "!",
    content: [
      {
        heading: "Fighters",
        bullets: [
          "Students are limited to one fighter per class",
          "Fighters include a name, description, theme styling, icon media, main art media, and optional movement media",
          "Supported media includes images, GIFs, and some video formats",
          "Upload previews are shown directly in the editor after a file is selected",
          "Teacher-created fighters can be scoped to one class or made available to all classes",
          "If a teacher removes a student from the class, that student's fighter for that class is also removed",
        ],
      },
      {
        heading: "Arenas",
        bullets: [
          "Students are limited to one arena per class",
          "Arenas include a name, icon, description, difficulty, and background media",
          "Arena media may be image or video depending on upload support",
          "Upload previews are shown directly in the editor after a file is selected",
          "Teacher-created arenas can be scoped to one class or made available to all classes",
          "If a teacher removes a student from the class, that student's arena for that class is also removed",
        ],
      },
      {
        heading: "Arena Background Preset Reference",
        paragraphs: [
          "The built-in arena background preset reference image is shown here.",
        ],
        image: {
          src: "/horizonLine.jpg",
          alt: "Horizon Line arena background preset",
        },
      },
      {
        heading: "Locking Behavior",
        bullets: [
          "Teachers can lock a class",
          "When a class is locked, students cannot add, edit, or delete class uploads",
          "Teachers retain broader control access",
        ],
      },
    ],
  },
  {
    title: "Fight Scene Tools",
    icon: "$",
    content: [
      {
        heading: "Movement And Presentation",
        bullets: [
          "The fight screen supports A / D movement for Player 1 and arrow-key movement for Player 2",
          "Teacher view includes live filter controls for each player",
          "Optional movement art is used when available, with fallback to the main fighter art",
        ],
      },
      {
        heading: "Screenshot And Export",
        bullets: [
          "The fight screen includes a screenshot tool for capturing the current scene",
          "The screenshot popup supports copy and download when browser permissions allow it",
          "A Photoshop export action builds a layered PSD with background, Player 2, and Player 1 layers",
          "The capture flow waits for media to load and uses a fallback renderer if the first capture attempt fails",
        ],
      },
    ],
  },
  {
    title: "Data Model",
    icon: "?",
    content: [
      {
        heading: "Users",
        bullets: [
          "Account identity",
          "Optional profile image",
          "Role",
          "Joined class references",
          "Active class reference",
          "Stored fighter uploads and custom arena records",
        ],
      },
      {
        heading: "Classes",
        bullets: [
          "Class name and join code",
          "Maximum member count",
          "Lock state",
          "Member list",
          "Teacher-facing completion state derived from uploads",
          "Teacher ownership metadata",
        ],
      },
      {
        heading: "Uploads",
        bullets: [
          "Class association",
          "Creator account association",
          "Teacher visibility scope for one-class or all-class assets",
          "Media URLs and storage keys",
          "Display metadata such as names, descriptions, colors, and icons",
        ],
      },
    ],
  },
  {
    title: "Technical Stack",
    icon: "@",
    content: [
      {
        heading: "Frameworks And Services",
        bullets: [
          "Next.js App Router",
          "React",
          "Framer Motion for transitions and presentation",
          "NextAuth for credential-based authentication",
          "MongoDB for app data",
          "S3-compatible storage for uploaded files when configured",
        ],
      },
      {
        heading: "Design Direction",
        paragraphs: [
          "The visual style is intentionally inspired by fighting-game menus, with bold display typography, diagonal stripe textures, gold highlight states, and red versus blue combat accents.",
        ],
      },
    ],
  },
  {
    title: "Navigation Notes",
    icon: "~",
    content: [
      {
        heading: "Single-Dashboard Structure",
        bullets: [
          "The main dashboard at / is the primary control surface",
          "Legacy split routes such as /classes and /account redirect back to home",
          "The app favors one main navigation flow for both teacher and student use",
        ],
      },
    ],
  },
];

export default function DocumentationPage() {
  return (
    <StaticContentPage
      eyebrow="REFERENCE"
      title="Website Documentation"
      subtitle="This documentation explains the purpose, structure, roles, workflows, and major technical behavior of Digital Art Battle."
      badge="FULL DOCUMENTATION"
      sections={sections}
    />
  );
}
