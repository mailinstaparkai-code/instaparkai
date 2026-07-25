-- Composite indexes for the ticket queries the Parking Admin surfaces run on every
-- page load. valet_tickets previously had only two *separate* single-column indexes
-- (parking_space_id, and status), which Postgres can't combine efficiently: it picks
-- one, then filters and sorts the rest without index support.
--
-- Sizing note, so nobody expects a visible win from this today: at the time of
-- writing valet_tickets holds ~20 rows, where a sequential scan is already faster
-- than any index and the planner will rightly ignore these. This is purely
-- future-proofing for growth -- the measured latency in this app comes from network
-- round-trips to the database, not from query planning. Don't remove them, but don't
-- credit them with a speedup either until the table is substantially larger.

-- getQueueData (queue/page.tsx + m/queue/page.tsx) and the dashboard's "today"
-- counts: filter parking_space_id + status in (...), order by checked_in_at.
create index if not exists valet_tickets_site_status_checked_in_idx
  on public.valet_tickets (parking_space_id, status, checked_in_at desc);

-- listVehicles + the vehicle-transactions report: filter parking_space_id over a
-- checked_in_at date range / order by checked_in_at, without always constraining
-- status (so the index above can't serve these).
create index if not exists valet_tickets_site_checked_in_idx
  on public.valet_tickets (parking_space_id, checked_in_at desc);

-- getAvailableOperators runs on every dispatch-picker render and every
-- auto-allocation, and keys off "which operator is currently out with a vehicle" --
-- i.e. rows with a non-null dispatched_by. Partial, since the null rows (the large
-- majority over time) are never what this looks for.
create index if not exists valet_tickets_dispatched_by_idx
  on public.valet_tickets (dispatched_by)
  where dispatched_by is not null;

-- markAllNotificationsRead filters (parking_space_id, read_at is null). The existing
-- (parking_space_id, created_at desc) index serves the bell's read path but not this
-- one. Partial for the same reason as above -- only unread rows are ever targeted.
create index if not exists valet_notifications_unread_idx
  on public.valet_notifications (parking_space_id)
  where read_at is null;
