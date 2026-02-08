import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Effect, pipe } from 'effect';
import { DatabaseService } from '@/effects/services/DatabaseService';
import { DatabaseServiceLive } from '@/effects/live/DatabaseServiceLive';
import { useAuth } from '@/contexts/AuthContext';

// Re-export types for backward compatibility
export type { PolicyRecord as Policy } from '@/effects/services/DatabaseService';
export type { TimelineEventRecord as TimelineEvent } from '@/effects/services/DatabaseService';
export type { CreatePolicyInput } from '@/effects/services/DatabaseService';

import type { CreatePolicyInput } from '@/effects/services/DatabaseService';

export function useUserPolicies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['policies', user?.id],
    queryFn: async () => {
      const program = pipe(
        DatabaseService,
        Effect.flatMap((svc) => svc.getUserPolicies()),
        Effect.provide(DatabaseServiceLive)
      );
      return Effect.runPromise(program);
    },
    enabled: !!user,
  });
}

export function usePolicy(policyId: string | undefined) {
  const { user } = useAuth();

  const policyQuery = useQuery({
    queryKey: ['policy', policyId],
    queryFn: async () => {
      const program = pipe(
        DatabaseService,
        Effect.flatMap((svc) => svc.getPolicy(policyId!)),
        Effect.provide(DatabaseServiceLive)
      );
      return Effect.runPromise(program);
    },
    enabled: !!user && !!policyId && policyId !== 'demo',
  });

  const timelineQuery = useQuery({
    queryKey: ['policy-timeline', policyId],
    queryFn: async () => {
      const program = pipe(
        DatabaseService,
        Effect.flatMap((svc) => svc.getPolicyTimeline(policyId!)),
        Effect.provide(DatabaseServiceLive)
      );
      return Effect.runPromise(program);
    },
    enabled: !!user && !!policyId && policyId !== 'demo',
  });

  return {
    policy: policyQuery.data,
    timeline: timelineQuery.data ?? [],
    isLoading: policyQuery.isLoading,
    error: policyQuery.error,
  };
}

export function useCreatePolicy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePolicyInput) => {
      if (!user) throw new Error('Not authenticated');

      const program = pipe(
        DatabaseService,
        Effect.flatMap((svc) => svc.createPolicy(user.id, input)),
        Effect.provide(DatabaseServiceLive)
      );
      const policy = await Effect.runPromise(program);

      // Create timeline event
      const timelineProgram = pipe(
        DatabaseService,
        Effect.flatMap((svc) =>
          svc.createTimelineEvent({
            policy_id: policy.id,
            user_id: user.id,
            event_type: 'created',
            description: `Policy minted — ${input.pool_type} shield for ${input.location_address}`,
          })
        ),
        Effect.provide(DatabaseServiceLive)
      );
      await Effect.runPromise(timelineProgram).catch((err) =>
        console.error('Timeline insert error:', err)
      );

      return policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}
