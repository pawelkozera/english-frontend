import { Button } from "./ui/button";

type TopTab = "overview" | "lessons" | "groups" | "library" | "assignments";
type GroupsTab = "manage" | "management";
type LibraryTab = "vocab" | "tasks" | "lessons";

type MainMenuProps = {
  activeSection: TopTab;
  onSectionChange: (value: TopTab) => void;
  groupsTab: GroupsTab;
  onGroupsTabChange: (value: GroupsTab) => void;
  libraryTab: LibraryTab;
  onLibraryTabChange: (value: LibraryTab) => void;
  isTeacher: boolean;
};

export default function MainMenu({
  activeSection,
  onSectionChange,
  groupsTab,
  onGroupsTabChange,
  libraryTab,
  onLibraryTabChange,
  isTeacher,
}: MainMenuProps) {
  return (
    <div className="space-y-3">
      <nav className="flex flex-wrap gap-2">
        <Button
          variant={activeSection === "overview" ? "default" : "ghost"}
          onClick={() => onSectionChange("overview")}
        >
          Overview
        </Button>
        <Button
          variant={activeSection === "lessons" ? "default" : "ghost"}
          onClick={() => onSectionChange("lessons")}
        >
          Lessons
        </Button>
        <Button
          variant={activeSection === "groups" ? "default" : "ghost"}
          onClick={() => onSectionChange("groups")}
        >
          Groups
        </Button>
        <Button
          variant={activeSection === "library" ? "default" : "ghost"}
          onClick={() => onSectionChange("library")}
        >
          Library
        </Button>
        {isTeacher && (
          <Button
            variant={activeSection === "assignments" ? "default" : "ghost"}
            onClick={() => onSectionChange("assignments")}
          >
            Assignments
          </Button>
        )}
      </nav>

      {activeSection === "groups" && (
        <nav className="flex flex-wrap gap-2 rounded-2xl border bg-background/70 p-2">
          <Button
            variant={groupsTab === "manage" ? "secondary" : "ghost"}
            onClick={() => onGroupsTabChange("manage")}
          >
            Manage groups
          </Button>
          <Button
            variant={groupsTab === "management" ? "secondary" : "ghost"}
            onClick={() => onGroupsTabChange("management")}
          >
            Group management
          </Button>
        </nav>
      )}

      {activeSection === "library" && (
        <nav className="flex flex-wrap gap-2 rounded-2xl border bg-background/70 p-2">
          <Button
            variant={libraryTab === "vocab" ? "secondary" : "ghost"}
            onClick={() => onLibraryTabChange("vocab")}
          >
            Vocabulary
          </Button>
          <Button
            variant={libraryTab === "tasks" ? "secondary" : "ghost"}
            onClick={() => onLibraryTabChange("tasks")}
          >
            Tasks
          </Button>
          {isTeacher && (
            <Button
              variant={libraryTab === "lessons" ? "secondary" : "ghost"}
              onClick={() => onLibraryTabChange("lessons")}
            >
              Lessons
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
