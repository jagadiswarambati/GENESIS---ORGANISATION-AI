from app.schemas.artifact import MissionArtifact
from app.schemas.review import (
    ProjectReviewDraft,
    ProjectReviewRequest,
    ReviewSuggestion,
    ReviewSuggestionDraft,
)
from app.schemas.workspace import WorkspaceFile, WorkspaceFolder

REQUIRED_FOLDERS = ("backend", "frontend", "docs", "tests", "deployment", "database")
CODE_EXTENSIONS = (".py", ".ts", ".tsx", ".js", ".jsx")


class DeterministicProjectReviewProvider:
    """A local, explainable reviewer for demos and provider-independent development."""

    @property
    def provider_name(self) -> str:
        return "Deterministic Project Reviewer"

    async def review(self, request: ProjectReviewRequest) -> ProjectReviewDraft:
        files = self._workspace_files(request.workspace.root_folder)
        suggestions: list[ReviewSuggestionDraft] = []
        strengths: list[str] = []
        weaknesses: list[str] = []
        opportunities: list[str] = []

        missing_folders = [
            folder for folder in REQUIRED_FOLDERS if folder not in self._folder_paths(request)
        ]
        if missing_folders:
            weaknesses.append(
                f"Workspace is missing required folders: {', '.join(missing_folders)}."
            )
            opportunities.append("Complete the repository skeleton before adding new features.")
        else:
            strengths.append(
                "Workspace includes the expected backend, frontend, quality, and deployment areas."
            )

        if (
            "Dockerfile" in request.package_included_files
            and "docker-compose.yml" in request.package_included_files
        ):
            strengths.append(
                "Package includes Docker and Compose configuration for a consistent handoff."
            )
        else:
            weaknesses.append("Deployment configuration is incomplete in the current package.")
            opportunities.append("Add a Dockerfile and docker-compose.yml before deployment.")

        code_file = next((file for file in files if file.file_name.endswith(CODE_EXTENSIONS)), None)
        if code_file and len(code_file.file_content.strip()) < 600:
            suggestions.append(
                ReviewSuggestionDraft(
                    category="code_quality",
                    severity="warning",
                    related_file=code_file.file_path,
                    description=(
                        "Generated source is minimal and leaves important implementation "
                        "detail implicit."
                    ),
                    suggested_improvement=(
                        "Expand the module with clear interfaces, error handling, and comments "
                        "that explain "
                        "its responsibility."
                    ),
                )
            )

        documentation_file = next(
            (file for file in files if file.file_path.startswith("docs/")),
            None,
        )
        if documentation_file:
            document = documentation_file.file_content.lower()
            if "install" not in document and "setup" not in document:
                suggestions.append(
                    ReviewSuggestionDraft(
                        category="documentation",
                        severity="warning",
                        related_file=documentation_file.file_path,
                        description=(
                            "Project documentation does not describe a setup or installation "
                            "path."
                        ),
                        suggested_improvement=(
                            "Add concise prerequisites, installation steps, and a first-run "
                            "example for new "
                            "contributors."
                        ),
                    )
                )
            else:
                strengths.append("Documentation includes an onboarding path for contributors.")

        backend_file = next(
            (
                file
                for file in files
                if file.file_path.startswith("backend/") and file.file_name.endswith(".py")
            ),
            None,
        )
        if (
            backend_file
            and "fastapi" not in backend_file.file_content.lower()
            and "router" not in backend_file.file_content.lower()
        ):
            suggestions.append(
                ReviewSuggestionDraft(
                    category="api_design",
                    severity="warning",
                    related_file=backend_file.file_path,
                    description=(
                        "Backend source does not make its API boundary or route ownership "
                        "explicit."
                    ),
                    suggested_improvement=(
                        "Separate route definitions from service behavior and document the request "
                        "and response "
                        "contract."
                    ),
                )
            )

        test_file = next(
            (
                file
                for file in files
                if file.file_path.startswith("tests/") and file.file_name.endswith(".py")
            ),
            None,
        )
        if test_file and "assert" not in test_file.file_content:
            suggestions.append(
                ReviewSuggestionDraft(
                    category="test_coverage",
                    severity="warning",
                    related_file=test_file.file_path,
                    description="The generated test file does not contain an observable assertion.",
                    suggested_improvement=(
                        "Add focused assertions for the primary success path and one meaningful "
                        "failure path."
                    ),
                )
            )

        if "README.md" in request.package_included_files:
            strengths.append("The export package includes a project README.")
        else:
            weaknesses.append("The export package is missing its README.")
            opportunities.append(
                "Add mission context, setup guidance, and architecture notes to the README."
            )

        if not suggestions:
            strengths.append(
                "No artifact-level changes are currently required by the deterministic reviewer."
            )
        else:
            weaknesses.extend(suggestion.description for suggestion in suggestions[:3])
            opportunities.extend(
                suggestion.suggested_improvement for suggestion in suggestions[:3]
            )

        score = max(
            0,
            100 - sum(12 if item.severity == "critical" else 6 for item in suggestions),
        )
        return ProjectReviewDraft(
            overall_score=score,
            suggestions=suggestions[:12],
            strengths=strengths[:8],
            weaknesses=weaknesses[:8],
            improvement_opportunities=opportunities[:8],
        )

    async def refine_artifact(
        self,
        artifact: MissionArtifact,
        suggestions: list[ReviewSuggestion],
        request: ProjectReviewRequest,
    ) -> str:
        del request
        summary = "; ".join(item.suggested_improvement for item in suggestions)
        if artifact.artifact_name.endswith((".py", ".ts", ".tsx", ".js", ".jsx", ".sql")):
            return f"{artifact.content.rstrip()}\n\n# Genesis refinement: {summary}\n"
        if artifact.artifact_name.endswith((".yml", ".yaml")):
            return f"{artifact.content.rstrip()}\n\n# Genesis refinement: {summary}\n"
        return f"{artifact.content.rstrip()}\n\n## Genesis Refinement\n\n{summary}\n"

    @staticmethod
    def _workspace_files(folder: WorkspaceFolder) -> list[WorkspaceFile]:
        files = list(folder.child_files)
        for child in folder.child_folders:
            files.extend(DeterministicProjectReviewProvider._workspace_files(child))
        return files

    @staticmethod
    def _folder_paths(request: ProjectReviewRequest) -> set[str]:
        return DeterministicProjectReviewProvider._collect_folder_paths(
            request.workspace.root_folder
        )

    @staticmethod
    def _collect_folder_paths(folder: WorkspaceFolder) -> set[str]:
        paths = {folder.folder_path}
        for child in folder.child_folders:
            paths.update(DeterministicProjectReviewProvider._collect_folder_paths(child))
        return paths
