import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { ReservationStatus } from './reservation.consts';

export type ReservationDocument = HydratedDocument<Reservation>;

@Schema({ timestamps: true })
export class Reservation {
    @Prop({ type: mongoose.Schema.Types.BigInt, unique: true, required: true })
    reservationId: number;

    @Prop({ required: true })
    guestName: string;

    @Prop({ type: mongoose.Schema.Types.String, required: true, enum: Object.values(ReservationStatus) })
    status: ReservationStatus;

    @Prop({ required: true })
    checkInDate: Date;

    @Prop({ required: true })
    checkOutDate: Date;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);