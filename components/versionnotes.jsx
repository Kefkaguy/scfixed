"use client";
//! I Made this page so i can take notes of version through months
import { useState } from "react";


const versions = [

  {
    id: "v5",
    label: "v5.0",
    date: "5/7/26",
    tagline: "Teacher gallery separation, upload preview fixes, and more reliable fight exports.",
    color: "#f0c020",
    colorMuted: "rgba(240,192,32,0.12)",
    sections: [
      {
        title: "Teacher Gallery",
        icon: "◇",
        items: [
          {
            heading: "My Gallery Moved To Dashboard",
            points: [
              "Teacher My Gallery is now opened directly from the home dashboard.",
              "The gallery is treated as its own teacher asset view instead of another class-content tab.",
              "The class-content tab bar now stays focused on GIF fighters, arena backgrounds, and students.",
            ],
          },
          {
            heading: "Separate Gallery Shell",
            points: [
              "The gallery header now says MY GALLERY instead of CLASS CONTENT.",
              "The active class label is hidden while teachers manage their own gallery assets.",
              "Gallery filtering still supports all assets, only fighters, and only arenas.",
            ],
          },
        ],
      },
      {
        title: "Teacher Asset Scope",
        icon: "◎",
        items: [
          {
            heading: "One Class Or All Classes",
            points: [
              "Teacher-created fighters and arenas can be scoped to one class or all classes.",
              "When ALL CLASSES is selected, the class dropdown is hidden because it is no longer needed.",
              "The same visibility behavior is used for both fighter and arena editors.",
            ],
          },
          {
            heading: "Upload Preview Fix",
            points: [
              "Selected image files now preview correctly in fighter and arena upload boxes.",
              "Blob previews now distinguish images from videos instead of treating every blob as video.",
              "The fix applies to fighter icons, fighter art, movement art, and arena backgrounds.",
            ],
          },
        ],
      },
      {
        title: "Fight Export Tools",
        icon: "⚔",
        items: [
          {
            heading: "Screenshot Capture Reliability",
            points: [
              "The fight screenshot tool now waits for images, videos, and fonts before capture.",
              "If html-to-image fails, the app falls back to html2canvas for the normal screenshot path.",
              "The popup now says SCREENSHOT STATUS when no captured image exists instead of claiming the screenshot is ready.",
            ],
          },
          {
            heading: "Photoshop Export Readiness",
            points: [
              "Photoshop export now waits for fight-scene media before building layers.",
              "Layered PSD exports still separate background, Player 2, and Player 1.",
              "Export status messaging was kept visible so teachers know when the file is being built.",
            ],
          },
        ],
      },
      {
        title: "Reference Pages",
        icon: "#",
        items: [
          {
            heading: "Documentation Updated",
            points: [
              "Website documentation now explains My Gallery, all-class teacher assets, and fight export tools.",
              "Upload rules now mention direct editor previews and teacher asset visibility scope.",
              "The data model notes now include teacher visibility scope for uploads.",
            ],
          },
          {
            heading: "Privacy Policy Clarified",
            points: [
              "The privacy policy now mentions teacher-selected visibility scope for teacher-created content.",
              "It clarifies that teacher-created assets may be visible across all classes when that option is selected.",
              "It notes local fight-scene screenshot and export behavior using media already visible in the browser.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "v4",
    label: "v4.0",
    date: "3/29/26",
    tagline: "Roster moderation, profile images, and stronger classroom visibility.",
    color: "#f59e0b",
    colorMuted: "rgba(245,158,11,0.12)",
    sections: [
      {
        title: "Teacher Class Content",
        icon: "âš¡",
        items: [
          {
            heading: "Students Tab In Class Content",
            points: [
              "Teachers now have a dedicated STUDENTS tab inside /custom-characters.",
              "That tab lists the students currently joined to the active class.",
              "Teachers can search the roster by student name or email.",
            ],
          },
          {
            heading: "Completion Status",
            points: [
              "Teacher roster rows now show whether each student is DONE or TODO.",
              "Completion is based on whether the student uploaded both a class fighter and a class arena.",
              "This gives teachers a faster view of who finished the required uploads.",
            ],
          },
          {
            heading: "Student Removal With Cleanup",
            points: [
              "Teachers can remove a student directly from the joined-students roster.",
              "Removing a student also clears that class from the student's membership records.",
              "The student's fighter and arena for that class are removed from stored class content as part of the same action.",
            ],
          },
        ],
      },
      {
        title: "Profile Pictures",
        icon: "â—ˆ",
        items: [
          {
            heading: "Dashboard Avatar Upload",
            points: [
              "Logged-in users can now upload a profile picture from the home dashboard.",
              "Profile pictures are stored on the user account and shown in teacher-facing student roster rows.",
              "This gives class rosters a clearer visual identity than name-only rows.",
            ],
          },
          {
            heading: "Avatar Interaction Cleanup",
            points: [
              "The dashboard avatar now uses a square presentation instead of the previous circular one.",
              "The separate upload/remove buttons were replaced with an inline edit affordance.",
              "A pen icon now appears on hover so editing stays available without cluttering the status board.",
            ],
          },
        ],
      },
      {
        title: "Dashboard Cleanup",
        icon: "â—‡",
        items: [
          {
            heading: "Teacher Hero Actions",
            points: [
              "The redundant VIEW MY CLASSES scroll action was removed from the teacher hero area.",
              "Teacher quick actions now focus on real destinations instead of internal-page scrolling.",
            ],
          },
          {
            heading: "Theme Refactor Started",
            points: [
              "A larger shared color-variable set was added to globals.css.",
              "Main dashboard and management screens now rely more on shared theme variables.",
              "This refactor was started so future palette changes can be handled from globals.css more cleanly.",
            ],
          },
        ],
      },
    ],
  },

  {
    id: "v1",
    label: "v1.0",
    date: "03/21/25",
    tagline: "The foundation. Draft, pick, fight.",
    color: "#a78bfa",
    colorMuted: "rgba(167,139,250,0.12)",
    sections: [
      {
        title: "Core System",
        icon: "⬡",
        items: [
          {
            heading: "Full Character Draft System",
            points: [
              "Supports 1v1 and 2v2 modes.",
              "Alternates picks between Player 1 and Player 2.",
              "Tracks draft order and prevents duplicate picks.",
              "Shows current turn and pick progress.",
            ],
          },
          {
            heading: "Keyboard + Mouse Controls",
            points: [
              "Arrow keys navigate the character grid.",
              "Enter / Space confirms the current selection.",
              "Mouse hover and click selection are supported.",
            ],
          },
          {
            heading: "Visual Character Grid",
            points: [
              "9-column grid layout.",
              "Each tile shows icon art or an element fallback.",
              "Hover animation, active cursor states, and picked badges.",
              "Player-colored borders and picked-state styling.",
            ],
          },
        ],
      },
      {
        title: "Character Presentation",
        icon: "◈",
        items: [
          {
            heading: "Dynamic Character Art",
            points: [
              "Supports PNG, JPG, GIF, MP4, WEBM, and MOV.",
              "Videos autoplay and loop.",
              "GIFs remain animated.",
              "Falls back to the element emoji when media is missing.",
            ],
          },
          {
            heading: "2v2 Character Stacks",
            points: [
              "Front and back characters are layered for team mode.",
              "Offset sizing and brightness create a fighting-game look.",
            ],
          },
          {
            heading: "Animated Name Plates",
            points: [
              "Large animated names appear for each player.",
              "Description overlays show flavor text during preview.",
            ],
          },
        ],
      },
      {
        title: "Match Presentation",
        icon: "⚡",
        items: [
          {
            heading: "Fight Intro Screen",
            points: [
              "Full-screen VS banner.",
              "Animated character entrances.",
              "Player team names and color-based glow effects.",
              "Works with stage backgrounds.",
            ],
          },
          {
            heading: "Fight Button Logic",
            points: [
              "FIGHT stays locked until drafting is complete.",
              "Visually changes when the match is ready.",
            ],
          },
        ],
      },
      {
        title: "Custom Characters",
        icon: "✦",
        items: [
          {
            heading: "Character Editor",
            points: [
              "Create, edit, and delete custom characters.",
              "Data persists in localStorage.",
              "Fields: name, title, colors, element, description, icon, art.",
            ],
          },
          {
            heading: "Drag & Drop Uploads",
            points: [
              "Supports image, GIF, and video uploads.",
              "Drop files directly or click to browse.",
              "Previews update instantly.",
            ],
          },
          {
            heading: "Roster Integration",
            points: [
              "Custom characters merge into the main roster automatically.",
            ],
          },
        ],
      },
      {
        title: "Stage System",
        icon: "◎",
        items: [
          {
            heading: "Stage Selection",
            points: [
              "Choose a stage before or after picking a mode.",
              "Selected stage shows a reminder badge with icon and name.",
            ],
          },
          {
            heading: "Dynamic Backgrounds",
            points: [
              "Character colors influence ambient glows and overlays.",
              "Effects blend with the selected stage background.",
            ],
          },
        ],
      },
      {
        title: "UI & Polish",
        icon: "◇",
        items: [
          {
            heading: "Motion",
            points: ["Framer Motion powers all transitions and hover states."],
          },
          {
            heading: "Theming",
            points: [
              "Player 1 — red accents.",
              "Player 2 — blue accents.",
              "Gold for highlights and ready states.",
            ],
          },
          {
            heading: "Extra Components",
            points: [
              "Pick slots strip.",
              "Turn banner.",
              "Mode select screen.",
              "Diagonal stripe overlays.",
            ],
          },
        ],
      },
      {
        title: "Fight Banner",  // ADD THIS NEW SECTION
        icon: "⚔",
        items: [
          {
            heading: "Animated VS + FIGHT! Sequence",
            points: [
              "VS text, player names, and FIGHT! all fade out automatically after ~2 seconds.",
              "Entire center block fades as one unit while individual animations (slide-in, spring) still play.",
              "FIGHT! scales in, holds, then fades out using a keyframe sequence.",
              "Center content is vertically and horizontally centered via position absolute + inset 0.",
            ],
          },
          {
            heading: "REMATCH Button Repositioned",
            points: [
              "Moved from center of screen to top-right corner.",
              "Positioned absolutely at top: 24, right: 28 with zIndex 20.",
              "Animates in from above with a slight y offset.",
              "Gold border and tinted background styling preserved.",
            ],
          },
          {
            heading: "Background Dim Control",
            points: [
              "Stage background darkness is controlled via the dimAmount prop on LevelBackground.",
              "Fight banner uses dimAmount={0.55} — increase toward 1.0 for darker, decrease toward 0 for lighter.",
            ],
          },
        ],
      },
      {
        title: "Stage Defaults",  // ADD THIS NEW SECTION
        icon: "◎",
        items: [
          {
            heading: "Default Level on Load",
            points: [
              "The easiest level (LEVELS[0]) is now pre-selected as the default stage.",
              "Users no longer start with no stage selected.",
              "Can be overridden to auto-sort by difficulty using .sort((a, b) => a.difficulty - b.difficulty)[0].",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "v2",
    label: "v2.0",
    date: "3/25/26",
    tagline: "Classes, accounts, and creator tracking for real classroom use.",
    color: "#34d399",
    colorMuted: "rgba(52,211,153,0.12)",
    sections: [
      {
        title: "Accounts & Auth",
        icon: "◈",
        items: [
          {
            heading: "Real Account Login",
            points: [
              "Students and teachers now use real accounts instead of browser-only identity.",
              "Login is handled with NextAuth credentials backed by MongoDB.",
              "Users keep their own account state even when classes are revisited later.",
            ],
          },
          {
            heading: "Teacher Roles",
            points: [
              "Teacher access now comes from the user's MongoDB role field.",
              "The old shared teacher admin code flow was removed.",
              "Teachers and admins can manage classes without relying on a guessable password.",
            ],
          },
        ],
      },
      {
        title: "Class System",
        icon: "◎",
        items: [
          {
            heading: "Class Creation + Join Codes",
            points: [
              "Teachers can create named classes with their own join codes.",
              "Each class has a teacher-set max student limit.",
              "Students must be logged in before joining a class.",
            ],
          },
          {
            heading: "Membership Stored In Classes",
            points: [
              "Class members are now stored directly inside each class document.",
              "Separate classMembers collection logic was removed from the app flow.",
              "Teacher views can inspect class membership from the class record itself.",
            ],
          },
          {
            heading: "Per-User Class State",
            points: [
              "Active class state is stored on the user in MongoDB, not in a shared browser cookie.",
              "Teacher showcase actions no longer switch another account's class on the same browser.",
              "Student class access now follows the logged-in user account correctly.",
            ],
          },
        ],
      },
      {
        title: "Creator Tracking",
        icon: "✦",
        items: [
          {
            heading: "Uploads Linked To Accounts",
            points: [
              "Custom GIFs and media stay tied to the class they were uploaded into.",
              "Character records store the uploading user and the class association.",
              "Showcase content is now filtered by class more cleanly.",
            ],
          },
          {
            heading: "Account Page",
            points: [
              "Users now have an account page with their name, role, and joined class info.",
              "The page lists the GIFs they uploaded.",
              "Each uploaded GIF shows which class it belongs to.",
            ],
          },
        ],
      },
      {
        title: "Teacher Controls",
        icon: "⚡",
        items: [
          {
            heading: "Cleaner Class Management",
            points: [
              "Teachers can manage classes directly from the control panel.",
              "The confusing Set Active flow was removed.",
              "Showcase buttons now open the chosen class directly instead of relying on hidden state.",
            ],
          },
          {
            heading: "Utility Improvements",
            points: [
              "Each class row includes a copy-code action for quick sharing.",
              "Class showcase layout was widened and cards were made larger for easier browsing.",
              "Teacher-side management works more clearly alongside student-side class membership.",
            ],
          },
        ],
      },
      {
        title: "Flow & UI Updates",
        icon: "◇",
        items: [
          {
            heading: "Simplified Start Screen",
            points: [
              "The old 1v1 label was replaced with a PLAY button.",
              "A direct account button was added to the front page.",
              "The overall flow now pushes users toward play, account, and class actions faster.",
            ],
          },
          {
            heading: "1v1 Only",
            points: [
              "2v2 was removed from the current game flow.",
              "The draft experience is now focused fully on the single-character matchup flow.",
              "Related UI was simplified to match the smaller scope.",
            ],
          },
          {
            heading: "Character Select Cleanup",
            points: [
              "The class label was moved away from the top-left character title area.",
              "Teachers and students now see cleaner class context in the character select header.",
              "The main character presentation has more room to breathe.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "v3",
    label: "v3.0",
    date: "3/25/26",
    tagline: "One home. One dashboard. Cleaner classroom flow.",
    color: "#60a5fa",
    colorMuted: "rgba(96,165,250,0.12)",
    sections: [
      {
        title: "Home Hub",
        icon: "⬡",
        items: [
          {
            heading: "Main Dashboard Rework",
            points: [
              "The front page is now the main dashboard for the whole app.",
              "Digital Art Battle now opens into a role-aware home hub instead of dropping straight into character select.",
              "Students and teachers now land in a single shared entry experience.",
            ],
          },
          {
            heading: "Role-Based Views",
            points: [
              "Students see their active class and their active-class uploads directly on the main page.",
              "Teachers see class creation, class stats, class actions, and class activation on the main page.",
              "The dashboard now acts as the central control room for both roles.",
            ],
          },
        ],
      },
      {
        title: "Teacher Flow",
        icon: "⚡",
        items: [
          {
            heading: "Classes Moved Into Home",
            points: [
              "Teacher class management was moved into the main dashboard.",
              "Class cards now include activate, view class content, pick character or arena, copy code, lock, and delete actions.",
              "Teacher workflow no longer depends on a separate class-management page.",
            ],
          },
          {
            heading: "Cleaner Active Class Routing",
            points: [
              "Teachers can make a class active directly from the dashboard.",
              "From there they can jump into class content or the arena picker with the correct class selected.",
              "This better matches real classroom use where the teacher chooses a class first, then enters the showcase or picker.",
            ],
          },
        ],
      },
      {
        title: "Student Flow",
        icon: "✦",
        items: [
          {
            heading: "My Class Content On Home",
            points: [
              "Students now see their GIF fighter and arena directly on the main dashboard.",
              "Only uploads from the active class are shown in the student dashboard view.",
              "This makes the class context much clearer than the older split-page setup.",
            ],
          },
          {
            heading: "Direct Edit + Remove",
            points: [
              "Students can edit or remove their fighter and arena directly from dashboard cards.",
              "The existing class-content modal now opens preloaded to the correct fighter or arena.",
              "Dashboard actions reduce the need to navigate through extra account or class pages.",
            ],
          },
          {
            heading: "Join Class + View Class Content",
            points: [
              "Students now get a real Join Class action from the main dashboard when they are not in an active class.",
              "The duplicate Manage My Class Content action was removed.",
              "Open Class Content now acts as a class showcase where students can view what everyone in that class uploaded.",
            ],
          },
          {
            heading: "Read-Only Student Showcase",
            points: [
              "Student class-content view is now read-only for other users' work.",
              "Students can still edit or remove their own uploads from their dashboard cards.",
              "Joined class cards now support switching the active class more directly.",
            ],
          },
          {
            heading: "Upload Tracker + Faster Add Flow",
            points: [
              "Students now see an upload tracker that shows class setup, fighter upload, and arena upload progress.",
              "The lower-right dashboard panel was changed from repeated joined-class info into a completion tracker.",
              "Empty fighter and arena states now open directly into the correct add flow from the dashboard.",
            ],
          },
        ],
      },
      {
        title: "Routing Cleanup",
        icon: "◎",
        items: [
          {
            heading: "Old Dashboard Pages Removed From Flow",
            points: [
              "The old /classes page now redirects to home.",
              "The old /account page now redirects to home.",
              "Navigation was updated so the app no longer relies on multiple separate dashboard pages.",
            ],
          },
          {
            heading: "Arena Route Separation",
            points: [
              "Character select was moved behind its own /arena route.",
              "This lets the home page stay focused on dashboard and classroom control instead of mixing both experiences together.",
              "The battle picker remains available, but it is no longer the first screen by default.",
            ],
          },
          {
            heading: "Active Class Persists Across Sign-Out",
            points: [
              "Signing out no longer clears the active class automatically.",
              "Students keep their current class context when they log back in.",
              "This prevents uploaded class content from seeming to disappear after a normal sign-out.",
            ],
          },
        ],
      },
      {
        title: "Picker Cleanup",
        icon: "◇",
        items: [
          {
            heading: "Footer Buttons Simplified",
            points: [
              "The old Add to Class and Teacher Controls buttons were removed from character select.",
              "Both roles now use a single Home Dashboard button from the picker.",
              "This keeps the bottom action bar aligned with the new one-dashboard structure.",
            ],
          },
          {
            heading: "Mode Select Navigation Updated",
            points: [
              "The old Account button on the mode screen was changed to Home.",
              "Navigation now consistently points back to the main dashboard instead of legacy pages.",
            ],
          },
          {
            heading: "Reset Picks + Movement Controls",
            points: [
              "Character select now includes a reset-picks action so players can draft again without leaving the screen.",
              "The fight screen now supports A and D for Player 1 and ArrowLeft and ArrowRight for Player 2 movement.",
              "Custom left and right movement animations are supported, with fallback to the normal fighter art when those extra files are missing.",
            ],
          },
        ],
      },
    ],
  },
];

export default function VersionNotes() {
  const [selectedId, setSelectedId] = useState(versions[0].id);
  const [activeSection, setActiveSection] = useState(0);
  const version = versions.find((v) => v.id === selectedId);
  const section = version.sections[activeSection];

  const handleVersionChange = (id) => {
    setSelectedId(id);
    setActiveSection(0);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .vn-root {
          display: flex;
          height: 100vh;
          background: #0d0d10;
          font-family: 'DM Sans', sans-serif;
          color: #e8e8f0;
          overflow: hidden;
        }

        /* ── Rail ── */
        .vn-rail {
          width: 216px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 24px 12px 24px;
          background: rgba(255,255,255,0.022);
          border-right: 1px solid rgba(255,255,255,0.055);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .vn-rail::-webkit-scrollbar { display: none; }

        .vn-rail-label {
          font-size: 10px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.24);
          padding: 0 10px;
          margin-bottom: 8px;
        }

        .vn-version-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          cursor: pointer;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.46);
          font-family: 'DM Mono', monospace;
          font-size: 12.5px;
          transition: background 0.13s, color 0.13s;
          text-align: left;
          width: 100%;
          margin-bottom: 2px;
        }
        .vn-version-btn:hover { background: rgba(255,255,255,0.055); color: rgba(255,255,255,0.8); }
        .vn-version-btn.active { background: rgba(255,255,255,0.068); color: #fff; }

        .vn-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .vn-divider {
          height: 1px;
          background: rgba(255,255,255,0.055);
          margin: 14px 0;
        }

        .vn-section-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 7px 10px;
          border-radius: 8px;
          cursor: pointer;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.38);
          font-family: 'DM Sans', sans-serif;
          font-size: 12.5px;
          font-weight: 400;
          transition: background 0.13s, color 0.13s;
          text-align: left;
          width: 100%;
          margin-bottom: 1px;
        }
        .vn-section-btn:hover { background: rgba(255,255,255,0.045); color: rgba(255,255,255,0.75); }
        .vn-section-btn.active { background: rgba(255,255,255,0.062); color: rgba(255,255,255,0.92); }
        .vn-section-icon { font-size: 11px; width: 14px; text-align: center; opacity: 0.55; }

        /* ── Main ── */
        .vn-main {
          flex: 1;
          overflow-y: auto;
          padding: 52px 56px 80px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .vn-main::-webkit-scrollbar { width: 4px; }
        .vn-main::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 4px; }

        /* Hero */
        .vn-hero { margin-bottom: 52px; }

        .vn-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: 'DM Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          padding: 4px 10px 4px 7px;
          border-radius: 99px;
          border: 1px solid;
          margin-bottom: 22px;
        }

        .vn-hero-title {
          font-size: clamp(36px, 4.5vw, 58px);
          font-weight: 300;
          letter-spacing: -0.025em;
          line-height: 1.08;
          color: #fff;
          margin-bottom: 14px;
        }

        .vn-hero-tagline {
          font-size: 15px;
          color: rgba(255,255,255,0.36);
          font-weight: 300;
          font-style: italic;
          letter-spacing: 0.01em;
        }

        /* Section header */
        .vn-sec-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 24px;
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.065);
        }
        .vn-sec-title {
          font-size: 19px;
          font-weight: 400;
          color: rgba(255,255,255,0.9);
          letter-spacing: -0.01em;
        }
        .vn-sec-count {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.22);
        }

        /* Cards */
        .vn-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: 12px;
        }

        .vn-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.065);
          border-radius: 13px;
          padding: 20px 20px 18px;
          transition: background 0.14s, border-color 0.14s;
        }
        .vn-card:hover {
          background: rgba(255,255,255,0.042);
          border-color: rgba(255,255,255,0.1);
        }

        .vn-card-heading {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 14px;
          letter-spacing: 0.015em;
        }

        .vn-card-points {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .vn-card-points li {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-size: 12.5px;
          line-height: 1.55;
          color: rgba(255,255,255,0.38);
          font-weight: 300;
        }
        .vn-card-points li::before {
          content: '';
          display: block;
          width: 3px; height: 3px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          flex-shrink: 0;
          margin-top: 7px;
        }
      `}</style>

      <div className="vn-root">

        {/* Rail */}
        <nav className="vn-rail">
          <p className="vn-rail-label">Releases</p>

          {versions.map((v) => (
            <button
              key={v.id}
              className={`vn-version-btn${selectedId === v.id ? " active" : ""}`}
              onClick={() => handleVersionChange(v.id)}
            >
              <span
                className="vn-dot"
                style={{ background: selectedId === v.id ? v.color : "rgba(255,255,255,0.16)" }}
              />
              {v.label}
            </button>
          ))}

          <div className="vn-divider" />
          <p className="vn-rail-label">Sections</p>

          {version.sections.map((s, i) => (
            <button
              key={s.title}
              className={`vn-section-btn${activeSection === i ? " active" : ""}`}
              onClick={() => setActiveSection(i)}
            >
              <span className="vn-section-icon">{s.icon}</span>
              {s.title}
            </button>
          ))}
        </nav>

        {/* Main */}
        <main className="vn-main">
          {activeSection === 0 && (
            <div className="vn-hero">
              <div
                className="vn-pill"
                style={{
                  color: version.color,
                  borderColor: `${version.color}45`,
                  background: version.colorMuted,
                }}
              >
                <span className="vn-dot" style={{ width: 5, height: 5, background: version.color }} />
                {version.label} &nbsp;·&nbsp; {version.date}
              </div>
              <h1 className="vn-hero-title">
                What&apos;s new<br />in this release
              </h1>
              <p className="vn-hero-tagline">{version.tagline}</p>
            </div>
          )}

          <div className="vn-sec-header">
            <h2 className="vn-sec-title">{section.title}</h2>
            <span className="vn-sec-count">{section.items.length} features</span>
          </div>

          <div className="vn-cards">
            {section.items.map((item) => (
              <div key={item.heading} className="vn-card">
                <p className="vn-card-heading" style={{ color: version.color }}>
                  {item.heading}
                </p>
                <ul className="vn-card-points">
                  {item.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </main>

      </div>
    </>
  );
}
