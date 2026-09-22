-- Backstop for PRD §7: exactly one isCover = true per listing.
-- Concurrent first-uploads can both pass the application check; the index
-- makes the loser fail with P2002, which the service maps to a retryable
-- friendly error.
CREATE UNIQUE INDEX "CoachingImage_cover_unique" ON "CoachingImage"("coachingId") WHERE "isCover";
