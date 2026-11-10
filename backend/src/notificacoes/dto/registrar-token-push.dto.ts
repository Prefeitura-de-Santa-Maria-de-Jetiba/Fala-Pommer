import {
    IsIn,
    IsNotEmpty,
    IsString,
    MaxLength
} from "class-validator";

export class RegistrarTokenPushDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    token!: string;

    @IsString()
    @IsIn(["android", "ios"])
    plataforma!: "android" | "ios";
}
