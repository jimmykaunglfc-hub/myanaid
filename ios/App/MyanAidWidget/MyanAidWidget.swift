import Foundation
import SwiftUI
import WidgetKit

private let widgetKind = "MyanAidSafetyWidget"
private let appGroup = "group.com.myanaid.app"
private let reminderKey = "advanceOutlookReminder"

private struct StoredReminder {
    let generatedAt: String
    let location: String
    let level: String
    let score: Int
    let companionId: String
    let companionName: String
    let currentCondition: String
    let forecastSummary: String
    let forecastRainChance: Int
    let forecastRainMm: Double
    let forecastWindKph: Int
    let recommendedActions: [String]
    let text: String

    init?(defaults: UserDefaults) {
        guard let value = defaults.dictionary(forKey: reminderKey),
              let generatedAt = value["generatedAt"] as? String,
              let level = value["level"] as? String else { return nil }
        self.generatedAt = generatedAt
        self.location = value["location"] as? String ?? "Your area"
        self.level = level
        self.score = Self.integer(value["score"])
        self.companionId = value["companionId"] as? String ?? "maya"
        self.companionName = value["companionName"] as? String ?? "Maya"
        self.currentCondition = value["currentCondition"] as? String ?? "Open MyanAid to refresh current conditions."
        self.forecastSummary = value["forecastSummary"] as? String ?? "Forecast details are available in MyanAid."
        self.forecastRainChance = Self.integer(value["forecastRainChance"])
        self.forecastRainMm = Self.number(value["forecastRainMm"])
        self.forecastWindKph = Self.integer(value["forecastWindKph"])
        self.recommendedActions = value["recommendedActions"] as? [String] ?? []
        self.text = value["text"] as? String ?? "Open MyanAid for your latest safety outlook."
    }

    private static func number(_ value: Any?) -> Double {
        (value as? NSNumber)?.doubleValue ?? 0
    }

    private static func integer(_ value: Any?) -> Int {
        (value as? NSNumber)?.intValue ?? 0
    }
}

private struct SafetyEntry: TimelineEntry {
    let date: Date
    let reminder: StoredReminder?
}

private struct SafetyProvider: TimelineProvider {
    private var defaults: UserDefaults { UserDefaults(suiteName: appGroup) ?? .standard }

    func placeholder(in context: Context) -> SafetyEntry {
        SafetyEntry(date: Date(), reminder: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (SafetyEntry) -> Void) {
        completion(SafetyEntry(date: Date(), reminder: StoredReminder(defaults: defaults)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SafetyEntry>) -> Void) {
        let entry = SafetyEntry(date: Date(), reminder: StoredReminder(defaults: defaults))
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
    }
}

private struct CompanionPortrait: View {
    let id: String
    let size: CGFloat

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [Color.white.opacity(0.98), Color(red: 0.78, green: 0.94, blue: 0.98)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            Image(assetName)
                .resizable()
                .scaledToFit()
                .padding(size * 0.05)
        }
        .frame(width: size, height: size)
        .overlay(
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .stroke(Color.white.opacity(0.9), lineWidth: 1)
        )
        .shadow(color: Color(red: 0.00, green: 0.49, blue: 0.72).opacity(0.16), radius: 6, y: 3)
        .accessibilityLabel("\(id) companion")
    }

    private var assetName: String {
        switch id {
        case "nimbus": return "CompanionNimbus"
        case "scout": return "CompanionScout"
        case "volt": return "CompanionVolt"
        case "sprout": return "CompanionSprout"
        case "nova": return "CompanionNova"
        case "iggy": return "CompanionIggy"
        case "beacon": return "CompanionBeacon"
        default: return "CompanionMaya"
        }
    }
}

private struct RiskGauge: View {
    let score: Int
    let level: String

    var body: some View {
        ZStack {
            Circle()
                .stroke(tint.opacity(0.18), lineWidth: 4)
            Circle()
                .trim(from: 0, to: CGFloat(max(0, min(score, 100))) / 100)
                .stroke(tint, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: -1) {
                Text("\(score)")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
            }
            .foregroundStyle(Color(red: 0.04, green: 0.16, blue: 0.24))
        }
        .frame(width: 39, height: 39)
        .accessibilityLabel("Risk score \(score) out of 100")
    }

    private var tint: Color {
        switch level {
        case "elevated": return Color(red: 0.86, green: 0.27, blue: 0.24)
        case "watch": return Color(red: 0.82, green: 0.49, blue: 0.08)
        default: return Color(red: 0.00, green: 0.59, blue: 0.68)
        }
    }
}

private struct ForecastValue: View {
    let systemImage: String
    let value: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: systemImage)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color(red: 0.00, green: 0.49, blue: 0.72))
            Text(value)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(Color(red: 0.03, green: 0.13, blue: 0.20))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }
}

private struct SafetyWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SafetyEntry

    var body: some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content.containerBackground(for: .widget) {
                widgetBackground
            }
        } else {
            content.background(widgetBackground)
        }
    }

    @ViewBuilder
    private var content: some View {
        if let reminder = entry.reminder {
            if family == .systemSmall {
                compactContent(reminder)
            } else {
                expandedContent(reminder)
            }
        } else {
            unconfiguredContent
        }
    }

    private func compactContent(_ reminder: StoredReminder) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 8) {
                CompanionPortrait(id: reminder.companionId, size: 43)
                VStack(alignment: .leading, spacing: 1) {
                    Text(reminder.companionName)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(ink)
                }
                Spacer(minLength: 0)
                RiskGauge(score: reminder.score, level: reminder.level)
            }
            Text(briefCondition(reminder.currentCondition))
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(slate)
                .lineLimit(1)
            adviceCard(primaryAction(for: reminder))
        }
        .padding(12)
        .widgetURL(URL(string: "myanaid://outlook"))
    }

    private func expandedContent(_ reminder: StoredReminder) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 9) {
                CompanionPortrait(id: reminder.companionId, size: 47)
                VStack(alignment: .leading, spacing: 2) {
                    Text(reminder.companionName)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(ink)
                    Label(briefCondition(reminder.currentCondition), systemImage: weatherSymbol(for: reminder.currentCondition))
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundStyle(slate)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                RiskGauge(score: reminder.score, level: reminder.level)
            }
            HStack(spacing: 4) {
                Text("72H")
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .foregroundStyle(teal)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 3)
                    .background(teal.opacity(0.12), in: Capsule())
                ForecastValue(systemImage: "cloud.rain.fill", value: "\(reminder.forecastRainChance)%")
                Divider().overlay(Color(red: 0.69, green: 0.84, blue: 0.90))
                ForecastValue(systemImage: "drop.fill", value: rainText(reminder.forecastRainMm))
                Divider().overlay(Color(red: 0.69, green: 0.84, blue: 0.90))
                ForecastValue(systemImage: "wind", value: "\(reminder.forecastWindKph) km/h")
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.58), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            adviceCard(primaryAction(for: reminder))
        }
        .padding(12)
        .widgetURL(URL(string: "myanaid://outlook"))
    }

    private var unconfiguredContent: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 9) {
                CompanionPortrait(id: "maya", size: 48)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Maya")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(ink)
                    Text("YOUR MYANAID COMPANION")
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .tracking(0.7)
                        .foregroundStyle(teal)
                }
                Spacer()
            }
            Text("Open MyanAid to load your personal weather outlook and recommended action.")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(slate)
                .lineLimit(3)
        }
        .padding(12)
        .widgetURL(URL(string: "myanaid://outlook"))
    }

    private func adviceCard(_ action: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "checkmark.shield.fill")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Color.white)
                .frame(width: 21, height: 21)
                .background(teal, in: Circle())
            VStack(alignment: .leading, spacing: 0) {
                Text(action)
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(ink)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 7)
        .padding(.vertical, 5)
        .background(Color.white.opacity(0.64), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func primaryAction(for reminder: StoredReminder) -> String {
        let action = reminder.recommendedActions.first ?? "Open MyanAid for the latest AI guidance."
        let normalized = action.lowercased()
        if normalized.contains("check") && normalized.contains("condition") { return "Check conditions before travel" }
        if normalized.contains("rain") && (normalized.contains("layer") || normalized.contains("protection")) { return "Carry rain protection" }
        if normalized.contains("authority") || normalized.contains("published") { return "Follow local weather notices" }
        if normalized.contains("open myanaid") { return "Open MyanAid to refresh" }
        return action
    }

    private func briefCondition(_ condition: String) -> String {
        let parts = condition.components(separatedBy: " · ")
        if parts.count >= 2 { return parts.prefix(2).joined(separator: " · ") }
        return condition
    }

    private func rainText(_ rain: Double) -> String {
        rain == rain.rounded() ? "\(Int(rain)) mm" : String(format: "%.1f mm", rain)
    }

    private func weatherSymbol(for condition: String) -> String {
        let description = condition.lowercased()
        if description.contains("thunder") || description.contains("storm") { return "cloud.bolt.rain.fill" }
        if description.contains("rain") || description.contains("shower") { return "cloud.rain.fill" }
        if description.contains("wind") { return "wind" }
        if description.contains("cloud") || description.contains("overcast") { return "cloud.sun.fill" }
        return "sun.max.fill"
    }

    private var widgetBackground: some View {
        LinearGradient(
            colors: [Color(red: 0.94, green: 0.99, blue: 1.0), Color(red: 0.78, green: 0.93, blue: 0.99)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var ink: Color { Color(red: 0.03, green: 0.13, blue: 0.20) }
    private var slate: Color { Color(red: 0.21, green: 0.32, blue: 0.40) }
    private var teal: Color { Color(red: 0.00, green: 0.49, blue: 0.72) }
}

@main
struct MyanAidSafetyWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: widgetKind, provider: SafetyProvider()) { entry in
            SafetyWidgetView(entry: entry)
        }
        .configurationDisplayName("MyanAid Outlook")
        .description("Your companion-led weather outlook and next recommended action.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
