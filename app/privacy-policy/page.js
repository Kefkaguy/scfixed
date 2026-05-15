import StaticContentPage from "@/components/StaticContentPage";

const sections = [
  {
    title: "Overview",
    icon: "*",
    content: [
      {
        heading: "What This Policy Covers",
        paragraphs: [
          "This privacy policy describes how Digital Art Battle handles account data, class participation data, and uploaded classroom content within the current version of the website.",
          "Digital Art Battle is a classroom-focused web application where teachers or school staff manage classes and students can upload custom fighter and arena content associated with those classes.",
        ],
      },
    ],
  },
  {
    title: "Information We Collect",
    icon: "+",
    content: [
      {
        heading: "Account Information",
        bullets: [
          "Name",
          "Username",
          "Password hash used for sign-in",
          "Optional profile picture if a user uploads one",
          "Role information such as teacher",
        ],
      },
      {
        heading: "Classroom Information",
        bullets: [
          "Joined classes and active class selection",
          "Class membership records",
          "Teacher-created class names, join codes, lock state, and class size limits",
          "Teacher-facing class completion indicators such as whether a student finished fighter and arena uploads for a class",
        ],
      },
      {
        heading: "Uploaded Content",
        bullets: [
          "Custom fighter and arena media uploaded by users",
          "Upload metadata such as creator name, creator account ID, class association, and timestamps",
          "Teacher-selected visibility scope for teacher-created content, such as one-class visibility or all-class visibility",
          "Text and presentation choices entered by users, such as names, descriptions, colors, icons, and difficulty values",
        ],
      },
    ],
  },
  {
    title: "How Information Is Used",
    icon: ">",
    content: [
      {
        heading: "Core App Functions",
        bullets: [
          "To create and maintain user accounts",
          "To authenticate users and keep them signed in",
          "To determine whether a user should see teacher controls",
          "To associate uploads with the correct class and creator",
          "To decide whether teacher-created fighters and arenas should appear in one class or across all classes",
          "To let teachers manage classes and review class participation",
          "To show user profile pictures in dashboard and teacher roster views",
        ],
      },
      {
        heading: "User Experience",
        bullets: [
          "To show a user's own uploads on the dashboard",
          "To show student profile pictures and upload completion state in teacher-facing class rosters",
          "To load class-specific content in the class showcase and arena picker",
          "To remember the currently active class on the user's account",
          "To let users create local fight-scene screenshots or layered exports from media already visible in the browser",
        ],
      },
    ],
  },
  {
    title: "Storage And Services",
    icon: "#",
    content: [
      {
        heading: "Where Data Is Stored",
        paragraphs: [
          "Account records, class records, and upload metadata are stored in MongoDB.",
          "Uploaded media files, including profile pictures, fighter media, and arena media, may be stored in Amazon S3 or another S3-compatible object storage service when uploads are enabled for a deployment.",
        ],
      },
      {
        heading: "Authentication And Sessions",
        paragraphs: [
          "Authentication uses NextAuth with credential-based sign-in. Session-related browser data may be used so users can remain signed in between page loads.",
          "The application may also store the user's active class on the user record so the app can reopen the correct class context later.",
        ],
      },
      {
        heading: "Service Providers",
        bullets: [
          "Hosting provider used for the deployment",
          "MongoDB database provider used by the operator",
          "S3-compatible storage provider used for uploaded media",
        ],
      },
    ],
  },
  {
    title: "Access And Sharing",
    icon: "=",
    content: [
      {
        heading: "Who Can Access Content",
        bullets: [
          "Teachers can view the classes they manage and the content uploaded within those classes.",
          "Teacher-created fighters and arenas may be visible across all classes when a teacher chooses that visibility option.",
          "Teachers can view joined student names, emails, profile pictures, and upload-completion state for the classes they manage.",
          "Students can view class content within the class context available to them in the app.",
          "Student uploads can be moderated by teachers.",
        ],
      },
      {
        heading: "No Sale Of Personal Information",
        paragraphs: [
          "The current application is not designed to sell personal information or build advertising profiles. The current app flow does not include payment processing or advertising systems.",
        ],
      },
    ],
  },
  {
    title: "Retention And Security",
    icon: "!",
    content: [
      {
        heading: "Retention",
        paragraphs: [
          "Data may remain stored until it is removed by the user, removed by a teacher or administrator, or deleted by the organization operating the deployment.",
          "If a teacher removes a student from a class, the app may also remove that student's class-specific fighter and arena content for that class from storage and related database records.",
          "Specific retention periods may depend on how the school or operator chooses to manage the deployment and its database backups.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "The app uses password hashing for account authentication. No system can guarantee absolute security, and the school or deployment operator is responsible for configuring hosting, database access, secrets, and storage securely.",
        ],
      },
    ],
  },
  {
    title: "User Choices",
    icon: "?",
    content: [
      {
        heading: "Managing Data",
        bullets: [
          "Users can edit or remove their own uploads where the interface allows it.",
          "Teachers can manage classes, lock or unlock classes, and moderate classroom content flow.",
          "Teachers can edit or remove their own teacher assets and choose whether those assets are visible in one class or all classes.",
          "Students can join classes and switch active class context through the app's available controls.",
        ],
      },
      {
        heading: "Requests",
        paragraphs: [
          "If you need help updating or deleting account information beyond the controls provided in the app, contact the school, teacher, or organization operating this deployment.",
        ],
      },
    ],
  },
  {
    title: "School And Child Privacy",
    icon: "@",
    content: [
      {
        heading: "Educational Use",
        paragraphs: [
          "This website is intended for school and classroom-style use. The school, teacher, or other operator responsible for the deployment is responsible for deciding whether student use is appropriate for their environment.",
          "If the app is used by minors or in a school setting, the operator should review applicable student and children's privacy requirements before production use, including school privacy rules and age-appropriate consent requirements where relevant.",
        ],
      },
    ],
  },
  {
    title: "Policy Updates",
    icon: "~",
    content: [
      {
        heading: "Changes To This Policy",
        paragraphs: [
          "This privacy policy may be updated as the website changes. If major features or data practices change, this page should be updated to reflect those changes.",
        ],
      },
    ],
  },
  {
    title: "Credits",
    icon: "%",
    content: [
      {
        heading: "Developer Credit",
        paragraphs: [
          "Developed by Erik Gaboyan (Kefka): https://kefka1.vercel.app/",
          "This application was created for classroom use and may be used or maintained by educators. Credit to the original developer is appreciated.",
        ],
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <StaticContentPage
      eyebrow="LEGAL"
      title="Privacy Policy"
      subtitle="This page describes the current privacy behavior of Digital Art Battle based on the website's account, class, and upload systems."
      badge="PRIVACY POLICY"
      sections={sections}
    />
  );
}
