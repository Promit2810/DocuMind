import requests

URL = "http://127.0.0.1:8000/api/ask"

filename = "PROMIT NANDY MERGE SORT.docx"

questions = [
    "What algorithm is used in this experiment?",
    "What is the expected output of this experiment?",
    "What is the conclusion of this experiment?",
    "What is the time complexity of merge sort?",
]

for i, question in enumerate(questions, 1):

    print("\n" + "=" * 70)
    print(f"TEST {i}")
    print(f"QUESTION: {question}")
    print("=" * 70)

    payload = {
        "filename": filename,
        "question": question
    }

    try:
        response = requests.post(
            URL,
            json=payload
        )

        print("STATUS:", response.status_code)

        try:
            print(response.json())
        except Exception:
            print(response.text)

    except Exception as e:
        print("ERROR:", e)