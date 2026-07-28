-- Site-wide toggle: guests either get a link (SMS/WhatsApp/Email) or scan a printed
-- QR card to request their vehicle -- mutually exclusive, never both at once.
alter table public.parking_spaces
  add column guest_request_mode text not null default 'link'
    check (guest_request_mode in ('link', 'qr'));
