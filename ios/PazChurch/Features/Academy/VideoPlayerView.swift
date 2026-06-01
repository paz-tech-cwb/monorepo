import SwiftUI
import WebKit
import Shared

// MARK: - WKWebView bridge

struct YouTubePlayerView: UIViewRepresentable {
    let youtubeId: String

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.isScrollEnabled = false
        webView.backgroundColor = .black
        webView.isOpaque = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let html = """
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; background: #000; }
            iframe { width: 100%; height: 100vh; border: none; }
          </style>
        </head>
        <body>
          <iframe
            src="https://www.youtube.com/embed/\(youtubeId)?autoplay=1&rel=0&modestbranding=1&playsinline=1"
            allow="autoplay; encrypted-media; fullscreen"
            allowfullscreen>
          </iframe>
        </body>
        </html>
        """
        webView.loadHTMLString(html, baseURL: URL(string: "https://www.youtube.com"))
    }
}

// MARK: - ViewModel

@MainActor
class VideoPlayerViewModel: ObservableObject {
    @Published var video: AcademyVideo?
    @Published var relatedVideos: [AcademyVideo] = []
    @Published var isLoading = true

    private let academyRepository: AcademyRepository
    private var currentVideoId: String

    init(videoId: String, academyRepository: AcademyRepository) {
        self.currentVideoId = videoId
        self.academyRepository = academyRepository
        load(videoId: videoId)
    }

    private func load(videoId: String) {
        Task {
            guard let content = try? await academyRepository.getAcademyContent() else {
                isLoading = false
                return
            }

            let found = content.videos.first { $0.id == videoId }
            let others = content.videos.filter { $0.id != videoId }
            let sameCategory = others.filter { $0.category == found?.category }
            let related = Array((sameCategory + others.filter { $0.category != found?.category }).prefix(6))

            self.video = found
            self.relatedVideos = related
            self.isLoading = false
        }
    }

    func onVideoTapped(_ videoId: String) {
        isLoading = true
        currentVideoId = videoId
        load(videoId: videoId)
    }
}

// MARK: - View

struct VideoPlayerView: View {
    let initialVideoId: String
    @StateObject private var viewModel: VideoPlayerViewModel
    @Environment(\.dismiss) var dismiss

    init(video: AcademyVideo) {
        self.initialVideoId = video.id
        _viewModel = StateObject(wrappedValue: VideoPlayerViewModel(
            videoId: video.id,
            academyRepository: AcademyRepositoryImpl()
        ))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
                Text(viewModel.video?.title ?? "")
                    .font(PazTypography.titleSmall)
                    .foregroundColor(.white)
                    .lineLimit(1)
                Spacer()
            }
            .padding(.horizontal, PazSpacing.lg)
            .padding(.vertical, PazSpacing.sm)
            .background(Color.black)

            // 16:9 player
            Group {
                if viewModel.isLoading {
                    ZStack {
                        Color.black
                        ProgressView().tint(.white)
                    }
                } else if let video = viewModel.video {
                    YouTubePlayerView(youtubeId: video.youtubeId)
                } else {
                    Color.black
                }
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(16 / 9, contentMode: .fit)
            .background(Color.black)

            // Metadata + related
            if !viewModel.isLoading, let video = viewModel.video {
                ScrollView {
                    VStack(alignment: .leading, spacing: PazSpacing.lg) {
                        // Metadata
                        VStack(alignment: .leading, spacing: PazSpacing.sm) {
                            Text(video.title)
                                .font(PazTypography.titleMedium)

                            HStack(spacing: PazSpacing.md) {
                                if let category = video.category {
                                    Text(category)
                                        .font(PazTypography.labelSmall)
                                        .foregroundColor(PazColors.primary)
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 4)
                                        .background(PazColors.primary.opacity(0.12))
                                        .cornerRadius(20)
                                }
                                if let duration = video.durationFormatted {
                                    Text(duration)
                                        .font(PazTypography.labelSmall)
                                        .foregroundColor(.gray)
                                }
                                if let views = video.viewCount {
                                    Text("\(views) visualizações")
                                        .font(PazTypography.labelSmall)
                                        .foregroundColor(.gray)
                                }
                            }

                            if let author = video.author {
                                Text(author)
                                    .font(PazTypography.bodySmall)
                                    .foregroundColor(.gray)
                            }
                        }

                        if let description = video.description, !description.isEmpty {
                            Text(description)
                                .font(PazTypography.bodySmall)
                                .foregroundColor(.gray)
                        }

                        if !viewModel.relatedVideos.isEmpty {
                            Text("Mais vídeos")
                                .font(PazTypography.titleSmall)

                            ForEach(viewModel.relatedVideos, id: \.id) { relVideo in
                                Button(action: { viewModel.onVideoTapped(relVideo.id) }) {
                                    RelatedVideoRow(video: relVideo)
                                }
                                .buttonStyle(.plain)
                            }
                        }

                        Spacer().frame(height: PazSpacing.xl)
                    }
                    .padding(.horizontal, PazSpacing.lg)
                    .padding(.top, PazSpacing.lg)
                }
                .background(PazColors.background)
            }
        }
        .background(Color.black)
        .navigationBarBackButtonHidden()
    }
}

private struct RelatedVideoRow: View {
    let video: AcademyVideo

    var body: some View {
        HStack(spacing: PazSpacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(PazColors.primary.opacity(0.15))
                    .frame(width: 80, height: 52)
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 24))
                    .foregroundColor(PazColors.primary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(video.title)
                    .font(PazTypography.titleSmall)
                    .lineLimit(2)
                if let dur = video.durationFormatted {
                    Text(dur)
                        .font(PazTypography.labelSmall)
                        .foregroundColor(.gray)
                }
            }
            Spacer()
        }
        .padding(PazSpacing.sm)
        .background(PazColors.surface)
        .cornerRadius(12)
    }
}

#Preview {
    VideoPlayerView(video: AcademyVideo(
        id: "1",
        title: "Série Identidade — Ep. 1",
        youtubeId: "dQw4w9WgXcQ",
        category: "Série",
        author: "Pr. Carlos Lima",
        durationSeconds: 2700
    ))
}
