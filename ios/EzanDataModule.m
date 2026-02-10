#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(EzanDataModule, NSObject)

// Tüm yıllık veriyi kaydet
RCT_EXTERN_METHOD(saveAllPrayerTimes:(NSDictionary *)dataMap city:(NSString *)city)

// Bir sonraki vakti kaydet
RCT_EXTERN_METHOD(saveNextPrayer:(NSString *)name time:(NSString *)time)

// Şehri kaydet
RCT_EXTERN_METHOD(saveCity:(NSString *)city)

// Bugünün vakitlerini kaydet
RCT_EXTERN_METHOD(saveTodaysPrayerTimes:(NSDictionary *)times)

@end