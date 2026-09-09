# Remaining Launch Steps

Based on the original launch plan for the Zaks Sales Portal, here are the key items that still need attention before a production release:

1. **Image Storage & Gallery**
   - Implement Supabase storage bucket for photos.
   - Add upload component (mobile camera capture, drag‑and‑drop for desktop).
   - Create a dedicated `/gallery` page that lists images per customer, visible only to logged‑in sales reps.
   - Ensure privacy: bucket policies restrict access to authenticated users and enforce per‑rep visibility.

2. **Manager Overview Page**
   - Replace the placeholder fake data with live metrics (already partly done).
   - Add column headers for *Logged Visits* and *Logged MTD* (completed).
   - Verify that all logged activities appear – run a data audit for the current month.
   - Provide a filter UI to view specific reps or date ranges.

3. **Sales Rep List Enhancements**
   - Show full list of sales reps (currently only top performers).
   - Nest visitor rows under each rep with lighter styling (implemented).
   - Indent and colour‑code visitor rows (implemented).
   - Add NetSuite MTD column next to Portal MTD (already present).

4. **Data Sync Filters**
   - Verify that NetSuite customer extraction filters for active customers only (per global rule).
   - Document how to toggle this filter for an "Inactive Accounts / Win‑back" dashboard.

5. **Testing & Validation**
   - Run `npm run build` and `npm run preview` to ensure the TypeScript compiles without errors.
   - Perform manual UI sanity checks for:
     * Dashboard hierarchy
     * Image upload/gallery flow
     * Auth protection on private pages
   - Add unit tests for data aggregation functions (e.g., `fetchData` utilities).

6. **Documentation**
   - Update README with new image upload instructions.
   - Add API docs for the new Supabase storage endpoints.
   - Ensure all code comments follow the project style.

7. **Deployment**
   - Configure CI/CD to run lint, tests, and build.
   - Set up environment variables for Supabase URL/Key in the production environment.
   - Prepare a rollout plan with feature flags for the image gallery.

---

If you would like me to start implementing any of the above items (e.g., the image storage feature) or run a build to verify the current code, just let me know!
