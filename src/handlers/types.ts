import {
  cinema_location,
  SeatType,
  ViewingFeature,
} from "../generated/prisma/client";

// ID only params
export type IDOnlyParam = {
  id: string;
};

export type CinemaIDParam = {
  cinema_id: string;
};

// schedule
export type ScheduleProps = {
  hall_id: string;
  movie_id: string;
  feature: ViewingFeature;
  start_time: number;
  end_time: number;
  price: number;
  allows_extras: boolean;
};

export type CreateSchedulesProps = {
  schedules: ScheduleProps | ScheduleProps[];
};

export type ScheduleByDateParams = {
  start_date: string;
  end_date: string;
  cinema_id: string;
};

export type DeleteSchedulesProps = {
  ids: string | string[];
};

// user
export type StaffProps = {
  email: string;
  password: string;
  full_name: string;
  cinema_id: string;
};

// hall
type SeatProps = {
  row_number: number;
  seat_number: number;
  seat_type: SeatType;
};

export type HallProps = {
  code: string;
  wheelchair_access: boolean;
  cinema_id: string;
  seats?: SeatProps[];
};

// seat
export type SeatCreateData = {
  hall_id: string;
  row_number: number;
  seat_number: number;
  seat_type: SeatType;
};

export type SeatUpdateData = {
  row_number?: number;
  seat_number?: number;
  seat_type?: SeatType;
};

export type CreateSeatsProps = {
  seats: SeatCreateData | SeatCreateData[];
};

export type UpdateSeatsProps = SeatUpdateData;

export type DeleteSeatsProps = {
  ids: string | string[];
};

// cinema
export type TicketExtrasProps = {
  ticket_extras: { [key: string]: number };
};

export type CinemaUpdateProps = {
  active: boolean;
  currency: string;
  editors: any[];
  logo: string;
  manager: string;
  name: string;
  policy_url: string;
  wallpaper_url: string;
  website: string;
};

export type CinemaProps = CinemaUpdateProps &
  TicketExtrasProps & {
    location: cinema_location;
  };
