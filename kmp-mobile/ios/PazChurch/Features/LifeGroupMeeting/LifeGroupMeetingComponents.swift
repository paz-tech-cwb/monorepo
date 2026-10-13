import SwiftUI

struct MeetingSectionTitle: View {
    let text: String

    var body: some View {
        Text(text)
            .font(PazTypography.titleMedium)
            .foregroundStyle(PazColors.titleInk)
            .padding(.top, PazSpacing.sm)
            .accessibilityAddTraits(.isHeader)
    }
}

struct MeetingStatusPill: View {
    let text: String
    let done: Bool

    var body: some View {
        Text(text)
            .font(PazTypography.labelMedium)
            .foregroundStyle(done ? PazColors.accent : PazColors.slate)
            .padding(.horizontal, PazSpacing.md)
            .padding(.vertical, PazSpacing.xs)
            .background(Capsule().fill(done ? PazColors.accent.opacity(0.15) : PazColors.slate.opacity(0.1)))
    }
}

struct MeetingSwitchRow: View {
    let title: String
    let subtitle: String?
    @Binding var isOn: Bool
    let isEnabled: Bool

    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(PazTypography.titleSmall).foregroundStyle(PazColors.ink)
                if let subtitle {
                    Text(subtitle).font(PazTypography.bodySmall).foregroundStyle(PazColors.slate)
                }
            }
        }
        .tint(PazColors.accent)
        .disabled(!isEnabled)
        .padding(.horizontal, PazSpacing.lg)
        .padding(.vertical, PazSpacing.md)
        .glassCard(radius: PazSpacing.cardRadiusCompact)
    }
}

struct MeetingNoticeCard: View {
    let text: String
    var isWarning = false
    var actionLabel: String?
    var onAction: () -> Void = {}

    var body: some View {
        HStack(spacing: PazSpacing.sm) {
            Text(text)
                .font(PazTypography.bodySmall)
                .foregroundStyle(PazColors.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let actionLabel {
                Button(actionLabel, action: onAction)
                    .font(PazTypography.titleSmall)
                    .foregroundStyle(PazColors.accent)
            }
        }
        .padding(PazSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(isWarning ? PazColors.error.opacity(0.12) : PazColors.accent.opacity(0.1))
        )
    }
}

/// Labelled text field with an inline validation message.
struct MeetingReportField: View {
    let label: String
    let placeholder: String
    let keyboard: UIKeyboardType
    let isEnabled: Bool
    let error: String?
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(PazTypography.labelMedium).foregroundStyle(PazColors.slate)
            TextField(placeholder, text: $text)
                .font(PazTypography.bodyMedium)
                .foregroundStyle(PazColors.ink)
                .keyboardType(keyboard)
                .disabled(!isEnabled)
                .padding(.horizontal, PazSpacing.md)
                .frame(height: 52)
                .glassCard(radius: 12)
                .opacity(isEnabled ? 1 : 0.6)
                .accessibilityLabel(label)
            if let error {
                Text(error).font(PazTypography.bodySmall).foregroundStyle(PazColors.error)
            }
        }
    }
}

/// Error / success line plus the section's save button.
struct MeetingSaveBlock: View {
    let error: String?
    let notice: String?
    let buttonText: String
    let isVisible: Bool
    let isEnabled: Bool
    let isLoading: Bool
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PazSpacing.sm) {
            if let error {
                Text(error).font(PazTypography.bodySmall).foregroundStyle(PazColors.error)
            }
            if let notice {
                Text(notice).font(PazTypography.bodySmall).foregroundStyle(PazColors.accent)
            }
            if isVisible {
                Button(action: action) {
                    if isLoading {
                        ProgressView()
                    } else {
                        Text(buttonText)
                    }
                }
                .buttonStyle(.pazPillPrimary)
                .disabled(!isEnabled)
            }
        }
    }
}
