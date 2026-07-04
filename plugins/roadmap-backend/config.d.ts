export interface Config {
  roadmap?: {
    /**
     * Datasource for roadmap data. Defaults to 'database'.
     */
    source?: 'database' | 'gitlab';

    /**
     * Entity refs treated as roadmap admins when the permission framework is
     * disabled, and recipients of new-suggestion notifications in all modes.
     * Group refs are expanded by the notifications backend.
     */
    adminUsers?: string[];

    /**
     * GitLab datasource connection details. Required when source is 'gitlab'.
     */
    gitlab?: {
      /**
       * Base URL for the GitLab API, e.g. https://gitlab.com/api/v4
       */
      apiBaseUrl: string;

      /**
       * Personal access token with API access to the project or group.
       * @visibility secret
       */
      token: string;

      /**
       * GitLab project ID (numeric) or URL-encoded path. Mutually exclusive
       * with groupId.
       */
      projectId?: string;

      /**
       * GitLab group ID or path; aggregates roadmap issues across all
       * projects in the group. Mutually exclusive with projectId.
       */
      groupId?: string;

      /**
       * Project where new features are created in group mode.
       */
      defaultProjectId?: string;
    };

    /**
     * Board column customization, merged with built-in defaults per status.
     */
    columns?: Array<{
      /**
       * One of: Suggested, Planned, In Progress, Completed, Declined.
       */
      status: string;

      /**
       * Column heading shown on the board. Defaults to the status name.
       */
      title?: string;

      /**
       * Hide the column (and omit its features from the default list) when
       * false.
       */
      visible?: boolean;

      /**
       * Hide features older than this many days from the default list
       * (database datasource only).
       */
      retentionDays?: number;

      /**
       * Which timestamp retention uses. Defaults to 'updated'.
       */
      retentionAnchor?: 'created' | 'updated';
    }>;
  };
}
