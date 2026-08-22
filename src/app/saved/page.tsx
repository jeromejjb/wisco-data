"use client";

import { useState } from "react";
import { Bookmark, MapPin, Navigation, Trash2 } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { useJobsData } from "@/hooks/use-live-data";
import type { SavedPlace } from "@/lib/types";

export default function SavedPage() {
  const { savedJobs, savedPlaces, addSavedPlace, removeSavedPlace, toggleSaveJob } =
    useAppStore();
  const { data: jobsData } = useJobsData({});
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlace, setNewPlace] = useState({ name: "", address: "", type: "other" });

  const jobById = new Map((jobsData?.data ?? []).map((j) => [j.id, j]));
  const savedJobList = savedJobs
    .map((id) => jobById.get(id))
    .filter(Boolean);
  const missingSavedIds = savedJobs.filter((id) => !jobById.has(id));

  function handleAddPlace(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlace.name || !newPlace.address) return;
    const place: SavedPlace = {
      id: `place-${Date.now()}`,
      name: newPlace.name,
      address: newPlace.address,
      type: newPlace.type as SavedPlace["type"],
      coordinates: { lat: 43.0389, lng: -87.9065 },
      createdAt: new Date().toISOString(),
    };
    addSavedPlace(place);
    setNewPlace({ name: "", address: "", type: "other" });
    setShowAddPlace(false);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Saved Places</h1>
          <p className="mt-1 text-muted-foreground">
            Your saved jobs, home and work locations, and commutes.
          </p>
        </div>
        <Button onClick={() => setShowAddPlace(!showAddPlace)}>
          <MapPin className="h-4 w-4" />
          Add place
        </Button>
      </div>

      {showAddPlace && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add a saved place</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPlace} className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="place-name">Name</Label>
                <Input
                  id="place-name"
                  value={newPlace.name}
                  onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                  placeholder="Home, Work…"
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="place-address">Address</Label>
                <Input
                  id="place-address"
                  value={newPlace.address}
                  onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
                  placeholder="123 Main St, Milwaukee, WI"
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="place-type">Type</Label>
                <Select
                  id="place-type"
                  value={newPlace.type}
                  onChange={(e) => setNewPlace({ ...newPlace, type: e.target.value })}
                  className="mt-1.5"
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">Save place</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Bookmark className="h-5 w-5" /> Saved jobs ({savedJobList.length + missingSavedIds.length})
          </h2>
          {savedJobList.length === 0 && missingSavedIds.length === 0 ? (
            <EmptyState
              title="No saved jobs yet"
              description="Save jobs from Find Jobs to compare opportunities and commutes later."
              action={
                <Link
                  href="/jobs"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-lake-600 px-5 text-sm font-medium text-white hover:bg-lake-700"
                >
                  Browse jobs
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {savedJobList.map((job) =>
                job ? (
                  <Card key={job.id}>
                    <CardContent className="flex items-center justify-between pt-6">
                      <div>
                        <p className="font-semibold">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.employer}</p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/transit?job=${job.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
                          aria-label="Plan trip"
                        >
                          <Navigation className="h-4 w-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleSaveJob(job.id)}
                          aria-label="Remove saved job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null
              )}
              {missingSavedIds.map((id) => (
                <Card key={id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div>
                      <p className="font-semibold text-muted-foreground">Listing no longer available</p>
                      <p className="text-sm text-muted-foreground">This saved job is not in the current live feed.</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleSaveJob(id)}
                      aria-label="Remove saved job"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5" /> Saved places ({savedPlaces.length})
          </h2>
          {savedPlaces.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-10 w-10" />}
              title="No saved places"
              description="Save home, work, and frequent destinations for faster trip planning."
            />
          ) : (
            <div className="space-y-3">
              {savedPlaces.map((place) => (
                <Card key={place.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div>
                      <p className="font-semibold">{place.name}</p>
                      <p className="text-sm text-muted-foreground">{place.address}</p>
                      <span className="mt-1 inline-block rounded-md bg-muted px-2 py-0.5 text-xs capitalize">
                        {place.type}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/transit?dest=${encodeURIComponent(place.address)}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
                        aria-label="Plan trip"
                      >
                        <Navigation className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSavedPlace(place.id)}
                        aria-label="Remove place"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
