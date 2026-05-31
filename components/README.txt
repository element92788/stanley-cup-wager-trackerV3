Also update app/page.tsx:
1. Add this import:
   import { FullSchedule } from "@/components/FullSchedule";

2. Add this component above HistoryTracker:
   <FullSchedule data={data} />

Example:
   <SeriesTracker data={data} />
   <FullSchedule data={data} />
   <HistoryTracker data={data} />

Also add the CSS from css-additions.txt to app/globals.css.
