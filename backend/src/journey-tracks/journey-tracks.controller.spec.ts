import { Test, TestingModule } from '@nestjs/testing';
import { JourneyTracksController } from './journey-tracks.controller';
import { JourneyProgressService } from './journey-progress.service';

describe('JourneyTracksController', () => {
  let controller: JourneyTracksController;
  let journeyProgressService: {
    getForMember: jest.Mock;
    getCurrentTrackForMember: jest.Mock;
  };

  beforeEach(async () => {
    journeyProgressService = {
      getForMember: jest.fn(),
      getCurrentTrackForMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JourneyTracksController],
      providers: [
        { provide: JourneyProgressService, useValue: journeyProgressService },
      ],
    }).compile();

    controller = module.get<JourneyTracksController>(JourneyTracksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMyFullJourney (GET /journey-tracks/me/all)', () => {
    it('returns all active tracks for the member along with the current track key and completion flag', async () => {
      const tracks = [
        { track: { key: 'become_member' }, steps: [], progress_percentage: 100 },
        { track: { key: 'discipler' }, steps: [], progress_percentage: 40 },
      ];
      journeyProgressService.getForMember.mockResolvedValue(tracks);
      journeyProgressService.getCurrentTrackForMember.mockResolvedValue({
        track: tracks[1],
        all_steps_complete: false,
      });

      const req = {
        user: { id: 42, role: { slug: 'member' } },
      } as unknown as Parameters<
        JourneyTracksController['getMyFullJourney']
      >[0];

      const result = await controller.getMyFullJourney(req);

      expect(journeyProgressService.getForMember).toHaveBeenCalledWith(42);
      expect(journeyProgressService.getCurrentTrackForMember).toHaveBeenCalledWith(
        42,
      );
      expect(result).toEqual({
        tracks,
        current_track_key: 'discipler',
        current_track_complete: false,
      });
    });

    it('returns a null current_track_key for roles with no mapped track (e.g. leadership roles)', async () => {
      journeyProgressService.getForMember.mockResolvedValue([]);
      journeyProgressService.getCurrentTrackForMember.mockResolvedValue({
        track: null,
        all_steps_complete: false,
      });

      const req = {
        user: { id: 7, role: { slug: 'sector_leader' } },
      } as unknown as Parameters<
        JourneyTracksController['getMyFullJourney']
      >[0];

      const result = await controller.getMyFullJourney(req);

      expect(result.current_track_key).toBeNull();
      expect(result.tracks).toEqual([]);
    });
  });
});
