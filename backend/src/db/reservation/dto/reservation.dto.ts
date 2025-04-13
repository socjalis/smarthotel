import { IsString, MaxLength, IsEnum, MinDate, MaxDate, IsInt, IsDateString, MinLength, Validate, IsDate } from 'class-validator';
import { ReservationStatus } from '../reservation.consts';
import { Expose, Transform } from 'class-transformer';

// taking into the account timezone differences
const MIN_DATE = new Date('2000-01-01T00:00:00Z');
const twoYearsFromNow = () => new Date(new Date().setFullYear(new Date().getFullYear() + 2));

export class ReservationDto {
    @Expose({ name: 'reservation_id' })
    @IsInt()
    reservationId: number;

    @Expose({ name: 'guest_name' })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    guestName: string;

    @Transform(({ value }) => {
        if(value === 'oczekująca') return ReservationStatus.PENDING;
        if(value === 'zrealizowana') return ReservationStatus.COMPLETED;
        if(value === 'anulowana') return ReservationStatus.CANCELLED;
        return value;
    })
    @IsEnum(ReservationStatus)
    status: ReservationStatus;

    @Expose({ name: 'check_in_date' })
    @Transform(({ value }) => new Date(value))
    @IsDate()
    @MinDate(MIN_DATE)
    @MaxDate(twoYearsFromNow)
    checkInDate: string;

    @Expose({ name: 'check_out_date' })
    @Transform(({ value }) => new Date(value))
    @IsDate()
    @MinDate(MIN_DATE)
    @MaxDate(twoYearsFromNow)
    @Validate(({ value, obj }) => {
        if (new Date(value) <= new Date(obj.checkInDate)) {
            throw new Error('Check out date must be after check-in date');
        }
        return value;
    })
    checkOutDate: string;
}
