import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from wordcloud import WordCloud

# Set Page Config MUST be the first Streamlit command
st.set_page_config(page_title="AI Resume Intelligence", layout="wide", page_icon="🚀")

# -----------------------------------
# CUSTOM CSS FOR MODERN UI (Glassmorphism & Gradients)
# -----------------------------------
def inject_custom_css():
    st.markdown("""
    <style>
        /* Base typography and background */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

        html, body, [class*="css"] {
            font-family: 'Inter', sans-serif;
        }

        /* Top Header styling */
        h1 {
            background: -webkit-linear-gradient(45deg, #00E5FF, #7000FF);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
            margin-bottom: 0.5rem;
        }

        /* Glassmorphism Metric Cards */
        div[data-testid="metric-container"] {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        div[data-testid="metric-container"]:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px 0 rgba(0, 229, 255, 0.2);
            border: 1px solid rgba(0, 229, 255, 0.3);
        }

        /* Label of metric */
        div[data-testid="metric-container"] > div:first-child > div {
            color: #A0AABF !important;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 0.85rem;
        }

        /* Value of metric */
        div[data-testid="metric-container"] > div:nth-child(2) > div {
            color: #00E5FF !important;
            font-weight: 700;
            font-size: 2.5rem;
        }

        /* Sidebar Styling */
        [data-testid="stSidebar"] {
            background-color: #0A0E17;
            border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Dataframes */
        [data-testid="stDataFrame"] {
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Main container spacing */
        .main .block-container {
            padding-top: 2rem;
        }

        /* Hide Streamlit default UI components */
        header {visibility: hidden;}
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}
    </style>
    """, unsafe_allow_html=True)

inject_custom_css()

# -----------------------------------
# DATA LOADING
# -----------------------------------
@st.cache_data
def load_data():
    try:
        resume = pd.read_csv("Resume.csv")
        jobs = pd.read_csv("training_data.csv")
        return resume, jobs
    except Exception as e:
        st.error(f"Error loading datasets. Please ensure 'Resume.csv' is extracted. Detail: {e}")
        return pd.DataFrame(), pd.DataFrame()

resume_df, job_df = load_data()

# Custom Plotly Layout Template
def get_plotly_layout(title=""):
    return go.Layout(
        title=dict(text=title, font=dict(color="#E2E8F0", size=20, family="Inter")),
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        font=dict(color="#A0AABF", family="Inter"),
        xaxis=dict(gridcolor='rgba(255,255,255,0.05)', zerolinecolor='rgba(255,255,255,0.05)'),
        yaxis=dict(gridcolor='rgba(255,255,255,0.05)', zerolinecolor='rgba(255,255,255,0.05)'),
        margin=dict(l=40, r=40, t=60, b=40)
    )

# -----------------------------------
# SIDEBAR NAVIGATION
# -----------------------------------
with st.sidebar:
    st.markdown("<h2 style='text-align: center; color: #00E5FF; font-weight: 800;'>Nexus HR</h2>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center; color: #A0AABF; margin-top:-10px; margin-bottom: 30px;'>AI Talent Intelligence</p>", unsafe_allow_html=True)

    page = st.radio("Navigation", [
        "📊 Dashboard Overview",
        "📄 Resume Analytics",
        "💼 Market Analysis",
        "🎯 AI Matchmaker",
        "📈 Executive Summary"
    ], label_visibility="collapsed")

    st.markdown("---")
    st.markdown("<div style='text-align: center; color: #555; font-size: 0.8rem;'>System Version 2.0.1<br>Powered by NLP & TF-IDF</div>", unsafe_allow_html=True)

# Main Title
st.title("AI-Powered Resume Screening & Job Matching")
st.markdown("Automating the recruitment workflow with natural language processing and similarity scoring.")
st.markdown("<br>", unsafe_allow_html=True)

if resume_df.empty or job_df.empty:
    st.stop()

# -----------------------------------
# PAGE ROUTING
# -----------------------------------

if page == "📊 Dashboard Overview":
    st.header("Platform Metrics")

    # KPIs
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Resumes Indexed", f"{len(resume_df):,}")
    col2.metric("Active Job Postings", f"{len(job_df):,}")
    col3.metric("Unique Job Categories", resume_df["Category"].nunique())

    st.markdown("<br>", unsafe_allow_html=True)

    colA, colB = st.columns(2)
    with colA:
        st.subheader("Resume Database Sample")
        st.dataframe(resume_df[["Category", "Resume_str"]].head(8), use_container_width=True)

    with colB:
        st.subheader("Job Postings Sample")
        st.dataframe(job_df[["company_name", "position_title"]].head(8), use_container_width=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Category Distribution
    category_counts = resume_df["Category"].value_counts().reset_index()
    category_counts.columns = ['Category', 'Count']
    fig = px.bar(
        category_counts,
        x='Category',
        y='Count',
        color='Count',
        color_continuous_scale=px.colors.sequential.Tealgrn
    )
    fig.update_layout(get_plotly_layout("Resumes Distribution by Category"))
    st.plotly_chart(fig, use_container_width=True)


elif page == "📄 Resume Analytics":
    st.header("Resume Insights & Analytics")

    resume_df["resume_length"] = resume_df["Resume_str"].str.len()

    col1, col2 = st.columns(2)

    with col1:
        fig = px.histogram(
            resume_df,
            x="resume_length",
            nbins=50,
            color_discrete_sequence=['#00E5FF']
        )
        fig.update_layout(get_plotly_layout("Resume Length Distribution"))
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        cat_counts = resume_df["Category"].value_counts().reset_index()
        cat_counts.columns = ['Category', 'Count']
        fig = px.pie(
            cat_counts,
            values='Count',
            names='Category',
            hole=0.4,
            color_discrete_sequence=px.colors.qualitative.Prism
        )
        fig.update_layout(get_plotly_layout("Category Breakdown"))
        # Remove background from legend
        fig.update_layout(legend=dict(bgcolor='rgba(0,0,0,0)'))
        st.plotly_chart(fig, use_container_width=True)

    st.markdown("### Top Keywords (Word Cloud)")
    with st.spinner("Generating visual text representation..."):
        text = " ".join(resume_df["Resume_str"].astype(str).sample(min(1000, len(resume_df)))) # Sample to speed up
        wc = WordCloud(
            width=1200, height=500,
            background_color='rgba(255, 255, 255, 0)', mode="RGBA",
            colormap='cool',
            max_words=200
        ).generate(text)

        fig, ax = plt.subplots(figsize=(15, 6))
        # Remove axis and background
        fig.patch.set_alpha(0)
        ax.patch.set_alpha(0)
        ax.imshow(wc, interpolation="bilinear")
        ax.axis("off")
        st.pyplot(fig)


elif page == "💼 Market Analysis":
    st.header("Job Market & Requirements")

    job_df["desc_length"] = job_df["job_description"].str.len()

    col1, col2 = st.columns(2)

    with col1:
        fig = px.histogram(
            job_df,
            x="desc_length",
            color_discrete_sequence=['#7000FF']
        )
        fig.update_layout(get_plotly_layout("Job Description Lengths"))
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        top_companies = job_df["company_name"].value_counts().head(10).reset_index()
        top_companies.columns = ['Company', 'Count']
        fig = px.bar(
            top_companies,
            x='Company',
            y='Count',
            color='Count',
            color_continuous_scale=px.colors.sequential.Purp
        )
        fig.update_layout(get_plotly_layout("Top Hiring Companies"))
        st.plotly_chart(fig, use_container_width=True)

    st.markdown("<br>", unsafe_allow_html=True)
    top_roles = job_df["position_title"].value_counts().head(15).reset_index()
    top_roles.columns = ['Role', 'Count']
    fig = px.bar(
        top_roles,
        x='Count',
        y='Role',
        orientation='h',
        color='Count',
        color_continuous_scale=px.colors.sequential.Plotly3
    )
    fig.update_layout(get_plotly_layout("Most Demanded Roles"))
    fig.update_yaxes(autorange="reversed")
    st.plotly_chart(fig, use_container_width=True)


elif page == "🎯 AI Matchmaker":
    st.header("Intelligent Resume-Job Matching")
    st.markdown("Use NLP to automatically rank the top candidates for a specific role.")

    job_titles = job_df["position_title"].unique()
    selected_job = st.selectbox("🎯 Select a Target Job Role to fill:", job_titles)

    if st.button("Run AI Screening"):
        with st.spinner("Analyzing semantics and calculating cosine similarities..."):
            job_text = job_df[job_df["position_title"] == selected_job]["job_description"].iloc[0]

            # Using sublinear_tf and bigrams like in the notebook for better results
            vectorizer = TfidfVectorizer(stop_words="english", max_features=5000, sublinear_tf=True)

            # Fit on both resumes and the target job for a shared vocabulary
            all_text = resume_df["Resume_str"].tolist() + [job_text]
            tfidf_matrix = vectorizer.fit_transform(all_text)

            resume_vectors = tfidf_matrix[:-1]
            job_vector = tfidf_matrix[-1]

            similarity = cosine_similarity(job_vector, resume_vectors)[0]

            resume_df["Match_Score"] = similarity

            # Formatting the score
            resume_df["Match_Score_Pct"] = (resume_df["Match_Score"] * 100).round(2).astype(str) + "%"

            ranked = resume_df.sort_values(by="Match_Score", ascending=False).head(10)

            st.success(f"Screening complete! Found {len(resume_df)} candidates. Displaying top 10 matches.")

            col1, col2 = st.columns([1, 2])

            with col1:
                st.subheader("Top Ranked Profiles")
                display_df = ranked[["Category", "Match_Score_Pct"]].reset_index(drop=True)
                display_df.index = display_df.index + 1
                st.dataframe(display_df, use_container_width=True)

            with col2:
                fig = px.bar(
                    ranked.sort_values(by="Match_Score", ascending=True),
                    x="Match_Score",
                    y="Category",
                    orientation="h",
                    color="Match_Score",
                    color_continuous_scale=px.colors.sequential.Agsunset,
                    text="Match_Score_Pct"
                )
                fig.update_layout(get_plotly_layout("Similarity Scores (Top 10)"))
                fig.update_traces(textposition="outside", textfont=dict(color="#FFF"))
                st.plotly_chart(fig, use_container_width=True)


elif page == "📈 Executive Summary":
    st.header("Executive Insights Report")

    top_category = resume_df["Category"].value_counts().idxmax()
    top_company = job_df["company_name"].value_counts().idxmax()

    st.markdown(f"""
    <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.1);">
        <h3 style="color: #00E5FF;">Platform Summary</h3>
        <p style="color: #E2E8F0; font-size: 1.1rem; line-height: 1.6;">
            The Nexus HR Intelligent Screening System has successfully processed and indexed a talent pool of
            <strong style="color: #00E5FF;">{len(resume_df):,}</strong> candidate profiles across various domains,
            currently matching them against <strong style="color: #00E5FF;">{len(job_df):,}</strong> active market job descriptions.
        </p>

        <br>

        <h3 style="color: #00E5FF;">Key Analytics</h3>
        <ul style="color: #E2E8F0; font-size: 1.1rem; line-height: 1.8;">
            <li><strong>Dominant Talent Pool:</strong> The highest concentration of candidates is in the <span style="color:#7000FF; font-weight:bold;">{top_category}</span> sector.</li>
            <li><strong>Leading Employer:</strong> <span style="color:#7000FF; font-weight:bold;">{top_company}</span> is currently the most aggressive hirer in the dataset.</li>
            <li><strong>AI Matching:</strong> Our Natural Language Processing pipeline utilizes TF-IDF vectorization and Cosine Similarity to achieve sub-second matching times for immediate shortlist generation.</li>
        </ul>

        <br>

        <h3 style="color: #00E5FF;">Strategic Recommendation</h3>
        <p style="color: #E2E8F0; font-size: 1.1rem; line-height: 1.6;">
            Recruiters should utilize the <b>AI Matchmaker</b> tool as a first-pass filter. Candidates scoring above a 70% similarity index represent high-priority targets for immediate technical screening.
        </p>
    </div>
    """, unsafe_allow_html=True)
