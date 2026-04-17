const VERSION = "1.0.1";

export { VERSION, DATA };

const DATA = [
    {
        level: "must",
        label: "MUST",
        principles: [
            {
                code: "S.1",
                name: "Self-containment",
                desc: "All modules and components essential to replicate computational execution MUST be reachable within a single top-level research object.",
                items: [
                    "Are all files and directories nested under a common root?",
                    "Are datasets included, linked, or referenced reachable from the code and environment specifications without crossing the boundary of a common root?",
                    "Is external software included in the environment or linked as submodules within the project boundary?",
                ],
            },
            {
                code: "T.1 + T.3",
                name: "Tracking",
                desc: "Persistent content identification MUST be recorded for all components. Provenance of all modifications MUST be recorded.",
                items: [
                    "Are version control systems such as <code>Git</code> used for code, text, documentation, and configuration files?",
                    "Are version control systems such as <code>git-annex</code>, DataLad, or <code>Git</code> LFS used for large binary data?",
                    "Are the exact environment specifications used to generate a set of results included in the provenance records to link computational actions to particular environments?",
                ],
            },
            {
                code: "A.1",
                name: "Actionability",
                desc: "The research object MUST contain sufficient instructions to reproduce all computational results.",
                items: [
                    "Is a <code>README.md</code> or <code>Makefile</code> included with instructions for installation and usage?",
                    "Is there a clear starting point for users to start reproducing results (e.g., a main script, a workflow definition, or a container image)?",
                ],
            },
            {
                code: "P.1",
                name: "Portability",
                desc: "Procedures MUST NOT depend on undocumented host environment state.",
                items: [
                    "Are relative paths used in scripts, avoiding hardcoded or system-specific paths like <code>C:\\Users\\...</code> or <code>/home/user/...</code>?",
                    "Are all software dependencies included in the environment specification, rather than relying on pre-installed tools?",
                    "Have all assumptions about the host system's configuration been documented (e.g., specific OS versions, required system libraries, or environment variables)?",
                ],
            },
            {
                code: "P.2",
                name: "Portability",
                desc: "Computational environments MUST be explicitly specified.",
                items: [
                    "Is there a clear list of system requirements and dependencies documented in the README or environment specifications?",
                ],
            },
            {
                code: "P.3",
                name: "Portability",
                desc: "Environment definitions MUST be version controlled.",
                items: [
                    "Are environment specifications (e.g., Dockerfiles, <code>pyproject.toml</code>, <code>package.json</code>) included in the version control system alongside code and data?",
                    "Is there a process for updating environment specifications when dependencies change, and are these updates tracked in version control?",
                ],
            },
            {
                code: "D.1",
                name: "Distributability",
                desc: "All referenced modules and components MUST be persistently retrievable by others.",
                items: [
                    "Are environment specifications (e.g., container digests, frozen package manifests) included to ensure others can attempt to exactly replicate the environment?",
                    "Are environment specifications shared in a way that others can access and use them (e.g., published container images, archived environment files)?",
                    "Is there documentation on how to obtain and use the environment specifications for reproduction?",
                ],
            },
        ],
    },
    {
        level: "should",
        label: "SHOULD",
        principles: [
            {
                code: "T.2",
                name: "Tracking",
                desc: "All components SHOULD be tracked using the same content-addressed version control system.",
                items: [
                    "Is a common version control system (e.g., <code>Git</code>, DVC, <code>git-annex</code>, or DataLad) used across all components?",
                ],
            },
            {
                code: "A.2",
                name: "Actionability",
                desc: "Procedures SHOULD be specified as executable specifications.",
                items: ["Is the workflow tested regularly to ensure instructions remain accurate?"],
            },
            {
                code: "M.1",
                name: "Modularity",
                desc: "Components SHOULD be organized in a modular structure.",
                items: [
                    "Are raw data, processed data, code, and environment definitions separated into distinct modules?",
                ],
            },
            {
                code: "E.1",
                name: "Ephemerality",
                desc: "Computational results SHOULD be produced in ephemeral environments.",
                items: [
                    "Is the pipeline tested in a fresh container, batch job, clean virtual machine, or cloud-based instance?",
                    "Does the workflow spawn disposable environments for each execution, allowing for isolation of runs?",
                ],
            },
            {
                code: "D.2",
                name: "Distributability",
                desc: "Environment specifications SHOULD support reproducible builds.",
                items: [
                    "Are the exact environment specifications used to generate a specific set of results regularly tested to ensure they can be reconstituted as intended?",
                    "Are environment artifacts archived within the research object where possible (e.g., executable binaries, container images)?",
                    "Is there a process for updating environment specifications when dependencies change, and are these updates tracked in version control?",
                ],
            },
        ],
    },
    {
        level: "may",
        label: "MAY",
        principles: [
            {
                code: "M.2",
                name: "Modularity",
                desc: "Components MAY be included directly or linked as subdatasets.",
                items: [
                    "Are external datasets or software dependencies included as submodules or linked as submodules?",
                    "Is the modular structure documented to clarify how components relate and can be recombined?",
                    "Are modular boundaries defined in a way that allows independent updates without breaking the overall workflow?",
                    "Is there a clear mechanism for composing modules together (e.g., <code>git</code> submodules, or container orchestration)?",
                    "Is there documentation or tooling to support users in understanding and navigating the modular structure?",
                ],
            },
        ],
    },
];
