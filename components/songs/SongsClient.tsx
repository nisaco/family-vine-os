'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { Song, SongResource, UserRole, Voicing, SongCategory, ResourceType } from '@/lib/types';
import { createSongAction, addSongResourceAction } from '@/lib/actions/songs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Music,
  Plus,
  Search,
  ExternalLink,
  FileText,
  Headphones,
  Video,
  Link as LinkIcon,
  BookOpen,
} from 'lucide-react';

interface SongsClientProps {
  songs: Song[];
  currentUserRole: UserRole;
}

export function SongsClient({ songs, currentUserRole }: SongsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [voicingFilter, setVoicingFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isNewSongOpen, setIsNewSongOpen] = useState(false);
  const [selectedSongForResource, setSelectedSongForResource] = useState<Song | null>(null);

  const [songState, songAction] = useFormState(createSongAction, null);
  const [resourceState, resourceAction] = useFormState(addSongResourceAction, null);

  const canManageSongs =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'PRESIDENT' ||
    currentUserRole === 'GENERAL_SECRETARY';

  const filtered = songs.filter((s) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.title.toLowerCase().includes(term) ||
      (s.composer_or_arranger && s.composer_or_arranger.toLowerCase().includes(term)) ||
      (s.lyrics_or_scripture && s.lyrics_or_scripture.toLowerCase().includes(term));

    const matchesVoicing = voicingFilter === 'ALL' || s.voicing === voicingFilter;
    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;

    return matchesSearch && matchesVoicing && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Choir Repertoire & Music Library
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Choral anthems, hymns, sheet music references, and rehearsal audio tracks
          </p>
        </div>

        {canManageSongs && (
          <Button onClick={() => setIsNewSongOpen(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Choral Work
          </Button>
        )}
      </div>

      {/* Search and Category Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, composer, or scripture reference..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={voicingFilter}
            onChange={(e) => setVoicingFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 text-stone-700"
          >
            <option value="ALL">All Voicings</option>
            <option value="SATB">SATB</option>
            <option value="SSA">SSA</option>
            <option value="TTBB">TTBB</option>
            <option value="UNISON">Unison</option>
            <option value="SOLO_CHOIR">Solo & Choir</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 text-stone-700"
          >
            <option value="ALL">All Categories</option>
            <option value="ANTHEM">Anthems</option>
            <option value="HYMN">Hymns</option>
            <option value="PRAISE">Praise & Thanksgiving</option>
            <option value="WORSHIP">Worship</option>
            <option value="EASTER">Easter Season</option>
            <option value="CHRISTMAS">Christmas / Advent</option>
          </select>
        </div>
      </div>

      {/* Song Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((song) => (
            <div
              key={song.id}
              className="bg-white rounded-xl border border-stone-200/90 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-choir-200 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {song.voicing && (
                        <Badge variant="gold" size="sm">
                          {song.voicing}
                        </Badge>
                      )}
                      {song.category && (
                        <Badge variant="default" size="sm">
                          {song.category}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-stone-900 leading-snug">
                      {song.title}
                    </h3>
                    {song.composer_or_arranger && (
                      <p className="text-xs text-stone-600 font-medium">
                        Composer / Arr.: {song.composer_or_arranger}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                  {song.key_signature && <span>Key: {song.key_signature}</span>}
                  {song.tempo && <span>Tempo: {song.tempo}</span>}
                  {song.lyrics_or_scripture && <span>Ref: {song.lyrics_or_scripture}</span>}
                </div>

                {song.notes && (
                  <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 leading-relaxed italic">
                    Performance note: {song.notes}
                  </p>
                )}

                {/* Attached External Practice & Score Links */}
                {song.resources && song.resources.length > 0 && (
                  <div className="pt-2 border-t border-stone-100 space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
                      Learning Resources & Links:
                    </span>
                    <div className="space-y-1">
                      {song.resources.map((res) => (
                        <a
                          key={res.id}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-2 rounded-lg bg-stone-50 hover:bg-stone-100 text-xs font-medium text-stone-800 transition-colors border border-stone-200/70"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {res.resource_type === 'SHEET_MUSIC_LINK' && (
                              <FileText className="w-3.5 h-3.5 text-choir-700 flex-shrink-0" />
                            )}
                            {res.resource_type === 'CHORD_CHART_LINK' && (
                              <Music className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            )}
                            {res.resource_type === 'DANCE_CHOREO_LINK' && (
                              <Video className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                            )}
                            {res.resource_type === 'AUDIO_REHEARSAL_LINK' && (
                              <Headphones className="w-3.5 h-3.5 text-gold-700 flex-shrink-0" />
                            )}
                            {res.resource_type === 'VIDEO_PERFORMANCE_LINK' && (
                              <Video className="w-3.5 h-3.5 text-sky-700 flex-shrink-0" />
                            )}
                            {res.resource_type === 'DOC_LINK' && (
                              <BookOpen className="w-3.5 h-3.5 text-stone-600 flex-shrink-0" />
                            )}
                            <span className="truncate">{res.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {res.target_wing && res.target_wing !== 'ALL' && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                res.target_wing === 'Family of Praise'
                                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                  : res.target_wing === 'Asaphites'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : res.target_wing === 'Vimmies'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-stone-50 text-stone-700'
                              }`}>
                                {res.target_wing}
                              </span>
                            )}
                            {res.voice_part && res.voice_part !== 'ALL' && (
                              <Badge size="sm" variant="info">
                                {res.voice_part}
                              </Badge>
                            )}
                            <ExternalLink className="w-3 h-3 text-stone-400" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {canManageSongs && (
                <div className="pt-2 border-t border-stone-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedSongForResource(song)}
                    className="text-xs font-semibold text-choir-800 hover:text-choir-950 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Attach Resource Link
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 text-stone-500 text-xs">
          <Music className="w-8 h-8 mx-auto text-stone-300 mb-2" />
          <p className="font-medium">No repertoire found matching your filters.</p>
        </div>
      )}

      {/* Add Song Modal */}
      <Modal
        isOpen={isNewSongOpen}
        onClose={() => setIsNewSongOpen(false)}
        title="Add Choral Work to Library"
        description="Catalog a new musical score, anthem, or liturgical hymn."
      >
        <form
          action={async (formData) => {
            await songAction(formData);
            setIsNewSongOpen(false);
          }}
          className="space-y-4"
        >
          {songState?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {songState.error}
            </div>
          )}

          <Input label="Song Title *" name="title" required placeholder="e.g. Hallelujah Chorus (Messiah)" />
          <Input label="Composer / Arranger" name="composer" placeholder="e.g. G.F. Handel / arr. Rutter" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Voicing
              </label>
              <select
                name="voicing"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="SATB">SATB</option>
                <option value="SSA">SSA</option>
                <option value="TTBB">TTBB</option>
                <option value="UNISON">Unison</option>
                <option value="SOLO_CHOIR">Solo & Choir</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Genre / Season
              </label>
              <select
                name="category"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="ANTHEM">Anthem</option>
                <option value="HYMN">Hymn</option>
                <option value="PRAISE">Praise & Thanksgiving</option>
                <option value="WORSHIP">Worship</option>
                <option value="EASTER">Easter</option>
                <option value="CHRISTMAS">Christmas / Advent</option>
                <option value="SPIRITUAL">Spiritual</option>
                <option value="CONTEMPORARY">Contemporary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Key Signature" name="keySignature" placeholder="e.g. D Major" />
            <Input label="Tempo / Time Signature" name="tempo" placeholder="e.g. Allegro (108 bpm)" />
          </div>

          <Input label="Scripture / Text Reference" name="lyricsOrScripture" placeholder="e.g. Revelation 19:6; 11:15" />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Rehearsal Directives & Performance Notes
            </label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Vocal technique directions, breath marks, or dynamic instructions..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsNewSongOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add to Repertoire</Button>
          </div>
        </form>
      </Modal>

      {/* Attach Resource Modal */}
      {selectedSongForResource && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSongForResource(null)}
          title={`Attach Resource: ${selectedSongForResource.title}`}
          description="Provide a link to verified sheet music PDFs, section practice audio, or video recordings."
        >
          <form
            action={async (formData) => {
              formData.append('songId', selectedSongForResource.id);
              await resourceAction(formData);
              setSelectedSongForResource(null);
            }}
            className="space-y-4"
          >
            {resourceState?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {resourceState.error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Resource Category *
              </label>
              <select
                name="resourceType"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="SHEET_MUSIC_LINK">Sheet Music (PDF / IMSLP Link)</option>
                <option value="CHORD_CHART_LINK">Band Chord Chart / Lead Sheet (Asaphites)</option>
                <option value="DANCE_CHOREO_LINK">Choreography Video / Dance Routine (Vimmies)</option>
                <option value="AUDIO_REHEARSAL_LINK">Practice Audio Track (MP3 / Audio URL)</option>
                <option value="VIDEO_PERFORMANCE_LINK">Video Recording (YouTube / Vimeo)</option>
                <option value="DOC_LINK">Document / Program Notes</option>
              </select>
            </div>

            <Input label="Resource Label *" name="title" required placeholder="e.g. Band Chord Progression & Rhythm Chart" />
            <Input label="Resource URL *" name="url" required type="url" placeholder="https://..." helperText="Must be a valid web link starting with https://" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Target Ministry Wing
                </label>
                <select
                  name="targetWing"
                  defaultValue="ALL"
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
                >
                  <option value="ALL">All Wings</option>
                  <option value="Family of Praise">Family of Praise (Choir)</option>
                  <option value="Asaphites">Asaphites (Band)</option>
                  <option value="Vimmies">Vimmies (Dancers)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Voice Part (If Choir)
                </label>
                <select
                  name="voicePart"
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
                >
                  <option value="ALL">All Parts / Not Applicable</option>
                  <option value="SOPRANO">Soprano Only</option>
                  <option value="ALTO">Alto Only</option>
                  <option value="TENOR">Tenor Only</option>
                  <option value="BASS">Bass Only</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedSongForResource(null)}>
                Cancel
              </Button>
              <Button type="submit">Attach Resource</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
