/**
 * Help content index - exports all section content
 */
import { gettingStartedContent } from "./gettingStarted";
import { songsAndPacksContent } from "./songsAndPacks";
import { statusesAndWorkflowContent } from "./statusesAndWorkflow";
import { collaborationContent } from "./collaboration";
import { collaborationRequestsContent } from "./collaborationRequests";
import { achievementsContent } from "./achievements";
import { publicReleasesContent } from "./publicReleases";
import { spotifyFeaturesContent } from "./spotifyFeatures";
import { bulkOperationsContent } from "./bulkOperations";
import { albumSeriesContent } from "./albumSeries";
import { faqContent } from "./faq";

export const helpSections = [
  { id: "getting-started", ...gettingStartedContent },
  { id: "songs-packs", ...songsAndPacksContent },
  { id: "statuses-workflow", ...statusesAndWorkflowContent },
  { id: "collaboration", ...collaborationContent },
  { id: "collaboration-requests", ...collaborationRequestsContent },
  { id: "public-releases", ...publicReleasesContent },
  { id: "spotify-features", ...spotifyFeaturesContent },
  { id: "bulk-operations", ...bulkOperationsContent },
  { id: "achievements", ...achievementsContent },
  { id: "album-series", ...albumSeriesContent },
  { id: "faq", ...faqContent },
];

export {
  gettingStartedContent,
  songsAndPacksContent,
  statusesAndWorkflowContent,
  collaborationContent,
  collaborationRequestsContent,
  achievementsContent,
  publicReleasesContent,
  spotifyFeaturesContent,
  bulkOperationsContent,
  albumSeriesContent,
  faqContent,
};

