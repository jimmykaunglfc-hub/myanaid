import Capacitor
import Foundation
import WidgetKit

@objc(MyanAidDevicePlugin)
final class MyanAidDevicePlugin: CAPPlugin, CAPBridgedPlugin {
    private let appGroup = "group.com.myanaid.app"
    private let reminderKey = "advanceOutlookReminder"
    private let preferencesKey = "deviceAlertPreferences"

    let identifier = "MyanAidDevicePlugin"
    let jsName = "MyanAidDevice"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveAdvanceOutlook", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPreferences", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise)
    ]

    private var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: appGroup) ?? .standard
    }

    @objc func saveAdvanceOutlook(_ call: CAPPluginCall) {
        guard let text = call.getString("text"),
              let location = call.getString("location"),
              let level = call.getString("level"),
              let generatedAt = call.getString("generatedAt") else {
            call.reject("invalid reminder payload")
            return
        }

        let reminder: [String: Any] = [
            "version": call.getInt("version") ?? 1,
            "generatedAt": generatedAt,
            "location": location,
            "level": level,
            "score": call.getInt("score") ?? 0,
            "companionId": call.getString("companionId") ?? "maya",
            "companionName": call.getString("companionName") ?? "Maya",
            "currentCondition": call.getString("currentCondition") ?? "Current conditions are available in MyanAid.",
            "forecastSummary": call.getString("forecastSummary") ?? "Open MyanAid for the latest forecast.",
            "forecastRainChance": call.getInt("forecastRainChance") ?? 0,
            "forecastRainMm": call.getDouble("forecastRainMm") ?? 0,
            "forecastWindKph": call.getInt("forecastWindKph") ?? 0,
            "recommendedActions": call.getArray("recommendedActions", String.self) ?? [],
            "text": text,
            "safetyNotice": call.getString("safetyNotice") ?? ""
        ]
        sharedDefaults.set(reminder, forKey: reminderKey)
        WidgetCenter.shared.reloadTimelines(ofKind: "MyanAidSafetyWidget")
        call.resolve(["saved": true])
    }

    @objc func setPreferences(_ call: CAPPluginCall) {
        let preferences: [String: Bool] = [
            "notifications": call.getBool("notifications") ?? false,
            "audio": call.getBool("audio") ?? false,
            "companion": call.getBool("companion") ?? false,
            "widget": call.getBool("widget") ?? false
        ]
        sharedDefaults.set(preferences, forKey: preferencesKey)
        WidgetCenter.shared.reloadTimelines(ofKind: "MyanAidSafetyWidget")
        call.resolve(["overlayPermission": "not-required"])
    }

    @objc func getCapabilities(_ call: CAPPluginCall) {
        call.resolve([
            "platform": "ios",
            "widget": true,
            "floatingMascot": false
        ])
    }
}

final class MyanAidBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MyanAidDevicePlugin())
    }
}
