import { Module } from "@nestjs/common";
import { NominatimGeocodingService } from "./nominatim-geocoding.service";

@Module({
  providers: [NominatimGeocodingService],
  exports: [NominatimGeocodingService],
})
export class GeocodingModule {}
