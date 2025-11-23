/**
 * Help content index - exports all section content
 */
import { gettingStartedContent } from "./gettingStarted";
import { songsAndPacksContent } from "./songsAndPacks";
import { statusesAndWorkflowContent } from "./statusesAndWorkflow";
import { collaborationContent } from "./collaboration";
import { spotifyFeaturesContent } from "./spotifyFeatures";
import { bulkOperationsContent } from "./bulkOperations";
import { albumSeriesContent } from "./albumSeries";
import { faqContent } from "./faq";

export const helpSections = [
  { id: "getting-started", ...gettingStartedContent },
  { id: "songs-packs", ...songsAndPacksContent },
  { id: "statuses-workflow", ...statusesAndWorkflowContent },
  { id: "collaboration", ...collaborationContent },
  { id: "spotify-features", ...spotifyFeaturesContent },
  { id: "bulk-operations", ...bulkOperationsContent },
  { id: "album-series", ...albumSeriesContent },
  { id: "faq", ...faqContent },
];

export {
  gettingStartedContent,
  songsAndPacksContent,
  statusesAndWorkflowContent,
  collaborationContent,
  spotifyFeaturesContent,
  bulkOperationsContent,
  albumSeriesContent,
  faqContent,
};

